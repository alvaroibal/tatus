-- Tatuś Sync — servidor (Fase 2 del Blueprint).
-- El servidor solo guarda bloques cifrados con ids opacos: nunca ve contenido en claro.
-- Todas las escrituras pasan por RPC `security definer`; las tablas no se escriben directamente.

-- ---------------------------------------------------------------------------
-- 2.2.1 Tablas, secuencia, índice y RLS
-- ---------------------------------------------------------------------------

create table public.spaces (
  id         text primary key check (id ~ '^[0-9a-f]{32}$'),
  auth_hash  text not null check (auth_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table public.space_members (
  space_id  text not null references public.spaces(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create sequence public.sync_seq;

create table public.sync_records (
  space_id   text   not null references public.spaces(id) on delete cascade,
  rid        text   not null check (length(rid) between 40 and 64),
  version    bigint not null,
  version_by text   not null,
  payload    text   check (payload is null or length(payload) <= 1048576),
  blob_path  text,
  seq        bigint not null,
  primary key (space_id, rid)
);
create index sync_records_pull on public.sync_records (space_id, seq);

alter table public.spaces        enable row level security;
alter table public.space_members enable row level security;
alter table public.sync_records  enable row level security;

-- Sin escrituras directas: solo lectura donde hace falta, todo lo demás vía RPC.
revoke all on table public.spaces, public.space_members, public.sync_records from anon, authenticated;
revoke all on sequence public.sync_seq from anon, authenticated;
grant select on table public.space_members, public.sync_records to authenticated;

-- space_members: cada usuario solo ve sus propias filas.
create policy space_members_select_own on public.space_members
  for select to authenticated
  using (user_id = (select auth.uid()));

-- sync_records: solo las filas de las familias de las que el usuario es miembro.
create policy sync_records_select_member on public.sync_records
  for select to authenticated
  using (exists (
    select 1 from public.space_members m
    where m.space_id = sync_records.space_id
      and m.user_id = (select auth.uid())
  ));

-- spaces: sin políticas → sin acceso directo.

-- ---------------------------------------------------------------------------
-- 2.2.2 RPCs (security definer, search_path vacío, nombres cualificados)
-- Errores: 42501 = sin sesión o no miembro · 22023 = parámetro inválido ·
--          23505 = la familia ya existe · P0001 = demasiados intentos en join_space
-- ---------------------------------------------------------------------------

-- Límite de intentos de join_space: máx. 10 fallos por (familia, usuario) en una ventana
-- de 1 hora que empieza en el primer fallo. Única tabla auxiliar; sin acceso directo.
create table public.join_attempts (
  space_id     text        not null references public.spaces(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  failures     integer     not null default 0,
  primary key (space_id, user_id)
);
alter table public.join_attempts enable row level security;
revoke all on table public.join_attempts from anon, authenticated;

-- create_space: crea la familia y añade al usuario como miembro. Falla si el id existe.
create function public.create_space(p_id text, p_auth_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if p_id is null or p_id !~ '^[0-9a-f]{32}$' then
    raise exception 'id de familia inválido' using errcode = '22023';
  end if;
  if p_auth_hash is null or p_auth_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'auth_hash inválido' using errcode = '22023';
  end if;

  insert into public.spaces (id, auth_hash) values (p_id, p_auth_hash);  -- 23505 si existe
  insert into public.space_members (space_id, user_id) values (p_id, v_uid);
end;
$$;

-- join_space: compara sha256(p_auth_secret) con auth_hash y añade al usuario (idempotente).
-- Un fallo NO lanza excepción (desharía el contador): se registra y se responde HTTP 403
-- con `response.status` de PostgREST, que confirma la transacción. Con 10 fallos en la
-- última hora, se rechaza incluso un secreto correcto.
create function public.join_space(p_id text, p_auth_secret text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_hash     text;
  v_failures integer;
  v_window   timestamptz;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if p_id is null or p_id !~ '^[0-9a-f]{32}$' then
    raise exception 'id de familia inválido' using errcode = '22023';
  end if;
  if p_auth_secret is null or p_auth_secret !~ '^[0-9a-f]{64}$' then
    raise exception 'auth_secret inválido' using errcode = '22023';
  end if;

  select s.auth_hash into v_hash from public.spaces s where s.id = p_id;
  if not found then
    raise exception 'acceso denegado' using errcode = '42501';
  end if;

  -- Serializa los intentos del mismo usuario sobre la misma familia.
  perform pg_advisory_xact_lock(hashtext('join_space'), hashtext(p_id || ':' || v_uid::text));

  select a.failures, a.window_start into v_failures, v_window
  from public.join_attempts a
  where a.space_id = p_id and a.user_id = v_uid;

  if found and v_window > now() - interval '1 hour' and v_failures >= 10 then
    raise exception 'demasiados intentos, prueba más tarde' using errcode = 'P0001';
  end if;

  -- Se comparan hashes SHA-256: el tiempo de `=` solo puede filtrar el prefijo común de
  -- dos hashes, que no revela nada del secreto (equivale a comparación en tiempo constante).
  if encode(extensions.digest(decode(p_auth_secret, 'hex'), 'sha256'), 'hex') = v_hash then
    insert into public.space_members (space_id, user_id) values (p_id, v_uid)
    on conflict (space_id, user_id) do nothing;
    delete from public.join_attempts a where a.space_id = p_id and a.user_id = v_uid;
    return;
  end if;

  insert into public.join_attempts as a (space_id, user_id, window_start, failures)
  values (p_id, v_uid, now(), 1)
  on conflict (space_id, user_id) do update set
    failures     = case when a.window_start <= now() - interval '1 hour' then 1 else a.failures + 1 end,
    window_start = case when a.window_start <= now() - interval '1 hour' then now() else a.window_start end;

  perform set_config('response.status', '403', true);
end;
$$;

-- push_records: upsert de cada registro solo si (version, version_by) es mayor que el guardado.
-- El bloqueo por familia serializa las subidas para que el orden de seq sea el de commit.
create function public.push_records(p_space text, p_records jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_applied integer := 0;
  v_n       integer;
  r         record;
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.space_members m where m.space_id = p_space and m.user_id = v_uid
  ) then
    raise exception 'acceso denegado' using errcode = '42501';
  end if;
  if p_records is null or jsonb_typeof(p_records) <> 'array' then
    raise exception 'p_records debe ser un array' using errcode = '22023';
  end if;
  if jsonb_array_length(p_records) > 500 then
    raise exception 'máximo 500 registros por llamada' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_space));

  for r in
    select x.rid, x.version, x.version_by, x.payload, x.blob_path
    from jsonb_to_recordset(p_records) as x(rid text, version bigint, version_by text, payload text, blob_path text)
  loop
    insert into public.sync_records as s (space_id, rid, version, version_by, payload, blob_path, seq)
    values (p_space, r.rid, r.version, r.version_by, r.payload, r.blob_path, nextval('public.sync_seq'))
    on conflict (space_id, rid) do update set
      version    = excluded.version,
      version_by = excluded.version_by,
      payload    = excluded.payload,
      blob_path  = excluded.blob_path,
      seq        = nextval('public.sync_seq')
    -- collate "C": mismo orden que la comparación de strings del cliente (merge.ts).
    where (excluded.version, excluded.version_by collate "C") > (s.version, s.version_by collate "C");

    get diagnostics v_n = row_count;
    v_applied := v_applied + v_n;
  end loop;

  return v_applied;
end;
$$;

-- pull_records: filas con seq > p_after ordenadas por seq; p_limit acotado a [1, 500].
create function public.pull_records(p_space text, p_after bigint, p_limit integer)
returns table (rid text, version bigint, version_by text, payload text, blob_path text, seq bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.space_members m where m.space_id = p_space and m.user_id = v_uid
  ) then
    raise exception 'acceso denegado' using errcode = '42501';
  end if;

  return query
    select s.rid, s.version, s.version_by, s.payload, s.blob_path, s.seq
    from public.sync_records s
    where s.space_id = p_space
      and s.seq > coalesce(p_after, 0)
    order by s.seq
    limit greatest(1, least(coalesce(p_limit, 500), 500));
end;
$$;

-- delete_space: borrado RGPD de la familia (cascade a miembros, registros e intentos)
-- y de los metadatos de sus objetos en Storage.
create function public.delete_space(p_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'sin sesión' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.space_members m where m.space_id = p_id and m.user_id = v_uid
  ) then
    raise exception 'acceso denegado' using errcode = '42501';
  end if;

  -- Storage prohíbe DELETE directo salvo con esta marca (solo para esta transacción).
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects o
  where o.bucket_id = 'sync-blobs' and split_part(o.name, '/', 1) = p_id;

  delete from public.spaces s where s.id = p_id;
end;
$$;

revoke all on function public.create_space(text, text)          from public, anon;
revoke all on function public.join_space(text, text)            from public, anon;
revoke all on function public.push_records(text, jsonb)         from public, anon;
revoke all on function public.pull_records(text, bigint, integer) from public, anon;
revoke all on function public.delete_space(text)                from public, anon;
grant execute on function public.create_space(text, text)          to authenticated;
grant execute on function public.join_space(text, text)            to authenticated;
grant execute on function public.push_records(text, jsonb)         to authenticated;
grant execute on function public.pull_records(text, bigint, integer) to authenticated;
grant execute on function public.delete_space(text)                to authenticated;

-- ---------------------------------------------------------------------------
-- 2.2.3 Storage: bucket privado sync-blobs, ruta {space_id}/{rid}, 1 MB por objeto
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('sync-blobs', 'sync-blobs', false, 1048576);

create policy sync_blobs_select_member on storage.objects
  for select to authenticated
  using (
    bucket_id = 'sync-blobs'
    and exists (
      select 1 from public.space_members m
      where m.space_id = split_part(name, '/', 1)
        and m.user_id = (select auth.uid())
    )
  );

create policy sync_blobs_insert_member on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'sync-blobs'
    and exists (
      select 1 from public.space_members m
      where m.space_id = split_part(name, '/', 1)
        and m.user_id = (select auth.uid())
    )
  );

create policy sync_blobs_update_member on storage.objects
  for update to authenticated
  using (
    bucket_id = 'sync-blobs'
    and exists (
      select 1 from public.space_members m
      where m.space_id = split_part(name, '/', 1)
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'sync-blobs'
    and exists (
      select 1 from public.space_members m
      where m.space_id = split_part(name, '/', 1)
        and m.user_id = (select auth.uid())
    )
  );

create policy sync_blobs_delete_member on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'sync-blobs'
    and exists (
      select 1 from public.space_members m
      where m.space_id = split_part(name, '/', 1)
        and m.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 2.2.4 Cuota por familia: máx. 20.000 filas en sync_records
-- AFTER INSERT (no BEFORE): con `insert … on conflict do update`, un BEFORE INSERT se
-- dispararía también en las actualizaciones y bloquearía editar a una familia llena.
-- push_records tiene el bloqueo por familia, así que el recuento es coherente.
-- ---------------------------------------------------------------------------

create function public.enforce_space_quota()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.sync_records s where s.space_id = new.space_id) > 20000 then
    raise exception 'cuota de la familia superada (20.000 registros)' using errcode = '54000';
  end if;
  return null;
end;
$$;

revoke all on function public.enforce_space_quota() from public, anon, authenticated;

create trigger sync_records_quota
  after insert on public.sync_records
  for each row execute function public.enforce_space_quota();
