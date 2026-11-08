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
