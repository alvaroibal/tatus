-- pgTAP de Tatuś Sync (Fase 2): RLS, RPCs, Storage, límite de intentos y LWW.
-- Ejecutar con `supabase test db`. Todo ocurre en una transacción que se deshace al final.
begin;
create extension if not exists pgtap with schema extensions;

select plan(65);

-- Datos fijos -----------------------------------------------------------------
--   familia S   = 'aaaa…' (32 hex)
--   authSecret  = 32 bytes 0xbb → sha256 = 4ca1…2ad6
--   usuarios    A (crea), B (no miembro → se une), C (fuerza bruta)
insert into auth.users (id) values
  ('aaaaaaaa-0000-0000-0000-00000000000a'),
  ('bbbbbbbb-0000-0000-0000-00000000000b'),
  ('cccccccc-0000-0000-0000-00000000000c');

-- =============================================================================
-- Usuario A: crea la familia, sube registros y un objeto
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select lives_ok(
  $$ select public.create_space(repeat('a', 32), '4ca14526b2751b640d549ce7caf8ac39438592211a0ec370064d57666a682ad6') $$,
  'A crea la familia'
);
select throws_ok(
  $$ select public.create_space(repeat('a', 32), '4ca14526b2751b640d549ce7caf8ac39438592211a0ec370064d57666a682ad6') $$,
  '23505', null, 'create_space falla si el id ya existe'
);
select throws_ok(
  $$ select public.create_space('NO-ES-HEX', '4ca14526b2751b640d549ce7caf8ac39438592211a0ec370064d57666a682ad6') $$,
  '22023', null, 'create_space valida el formato del id'
);
select throws_ok(
  $$ select public.create_space(repeat('c', 32), 'corto') $$,
  '22023', null, 'create_space valida el formato de auth_hash'
);

select is(
  public.push_records(repeat('a', 32), jsonb_build_array(
    jsonb_build_object('rid', repeat('1', 40), 'version', 100, 'version_by', 'dev-m', 'payload', 'cifrado-v100'),
    jsonb_build_object('rid', repeat('2', 40), 'version', 100, 'version_by', 'dev-m', 'payload', null,
                       'blob_path', repeat('a', 32) || '/' || repeat('2', 40))
  )),
  2, 'A sube 2 registros'
);
select results_eq(
  $$ select count(*) from public.space_members $$, array[1::bigint],
  'A ve su propia fila de space_members'
);
select results_eq(
  $$ select count(*) from public.sync_records $$, array[2::bigint],
  'A ve los registros de su familia'
);
select lives_ok(
  $$ insert into storage.objects (bucket_id, name) values ('sync-blobs', repeat('a', 32) || '/' || repeat('2', 40)) $$,
  'A (miembro) puede escribir en el bucket de su familia'
);
select results_eq(
  $$ select count(*) from storage.objects where bucket_id = 'sync-blobs' $$, array[1::bigint],
  'A (miembro) puede leer los objetos de su familia'
);

-- =============================================================================
-- 2.3.1 Usuario B (no miembro): no lee, no escribe, no lista
-- =============================================================================
select set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-00000000000b","role":"authenticated"}', true);

select is_empty($$ select * from public.sync_records $$, 'B no ve filas de sync_records');
select is_empty($$ select * from public.space_members $$, 'B no ve filas de space_members de A');
select throws_ok($$ select * from public.spaces $$, '42501', null, 'spaces no tiene acceso directo');
select throws_ok(
  $$ select public.push_records(repeat('a', 32), '[]'::jsonb) $$,
  '42501', null, 'B no puede hacer push'
);
select throws_ok(
  $$ select * from public.pull_records(repeat('a', 32), 0, 100) $$,
  '42501', null, 'B no puede hacer pull'
);
select throws_ok(
  $$ select public.delete_space(repeat('a', 32)) $$,
  '42501', null, 'B no puede borrar la familia'
);
select throws_ok(
  $$ insert into public.sync_records values (repeat('a', 32), repeat('9', 40), 1, 'x', 'p', null, 1) $$,
  '42501', null, 'sin INSERT directo en sync_records'
);
select throws_ok(
  $$ insert into public.space_members (space_id, user_id) values (repeat('a', 32), 'bbbbbbbb-0000-0000-0000-00000000000b') $$,
  '42501', null, 'sin INSERT directo en space_members (no puede colarse en la familia)'
);
select throws_ok(
  $$ update public.sync_records set payload = 'x' $$,
  '42501', null, 'sin UPDATE directo en sync_records'
);
select throws_ok(
  $$ delete from public.sync_records $$,
  '42501', null, 'sin DELETE directo en sync_records'
);
select is_empty(
  $$ select * from storage.objects where bucket_id = 'sync-blobs' $$,
  'B no lista ni lee objetos del bucket de la familia de A'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name) values ('sync-blobs', repeat('a', 32) || '/' || repeat('3', 40)) $$,
  '42501', null, 'B no puede subir objetos a la familia de A'
);
select results_eq(
  $$ with u as (update storage.objects set name = name || 'x' where bucket_id = 'sync-blobs' returning 1)
     select count(*) from u $$,
  array[0::bigint], 'B no puede modificar objetos de la familia de A'
);
-- Storage ya prohíbe DELETE directo; se levanta esa marca para probar la política RLS.
select set_config('storage.allow_delete_query', 'true', true);
select results_eq(
  $$ with d as (delete from storage.objects where bucket_id = 'sync-blobs' returning 1)
     select count(*) from d $$,
  array[0::bigint], 'B no puede borrar objetos de la familia de A'
);
select set_config('storage.allow_delete_query', 'false', true);

-- B con auth_secret incorrecto: no se une y la respuesta HTTP es 403.
select set_config('response.status', '', true);
select lives_ok(
  $$ select public.join_space(repeat('a', 32), repeat('0', 64)) $$,
  'join_space con secreto incorrecto no lanza (el contador debe persistir)'
);
select is(current_setting('response.status', true), '403', 'secreto incorrecto → HTTP 403 (error para el cliente)');
select throws_ok(
  $$ select * from public.pull_records(repeat('a', 32), 0, 100) $$,
  '42501', null, 'tras el fallo, B sigue sin poder hacer pull'
);
select throws_ok(
  $$ select public.join_space(repeat('a', 32), 'no-hex') $$,
  '22023', null, 'join_space valida el formato del secreto'
);
select throws_ok(
  $$ select public.join_space(repeat('f', 32), repeat('b', 64)) $$,
  '42501', null, 'join_space a una familia inexistente falla'
);

-- B con auth_secret correcto: se une y ya puede pull.
select set_config('response.status', '', true);
select lives_ok(
  $$ select public.join_space(repeat('a', 32), repeat('b', 64)) $$,
  'B se une con el secreto correcto'
);
select is(current_setting('response.status', true), '', 'secreto correcto → sin estado de error');
select lives_ok(
  $$ select public.join_space(repeat('a', 32), repeat('b', 64)) $$,
  'join_space es idempotente'
);
select results_eq(
  $$ select count(*) from public.pull_records(repeat('a', 32), 0, 100) $$,
  array[2::bigint], 'B (ya miembro) puede hacer pull'
);
select results_eq(
  $$ select count(*) from storage.objects where bucket_id = 'sync-blobs' $$,
  array[1::bigint], 'B (ya miembro) puede leer los objetos de la familia'
);

-- =============================================================================
-- 2.3.1 Límite de intentos: tras 10 fallos, bloqueado aunque acierte dentro de la hora
-- =============================================================================
select set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-00000000000c","role":"authenticated"}', true);

select lives_ok(
  $$ select public.join_space(repeat('a', 32), lpad(g::text, 64, '0')) from generate_series(1, 10) g $$,
  'C falla 10 veces'
);
select throws_ok(
  $$ select public.join_space(repeat('a', 32), repeat('b', 64)) $$,
  'P0001', null, 'C bloqueado: el secreto correcto se rechaza dentro de la hora'
);
select throws_ok(
  $$ select * from public.pull_records(repeat('a', 32), 0, 100) $$,
  '42501', null, 'C sigue sin ser miembro'
);

reset role;
update public.join_attempts set window_start = now() - interval '61 minutes'
where user_id = 'cccccccc-0000-0000-0000-00000000000c';
select results_eq(
  $$ select failures from public.join_attempts where user_id = 'cccccccc-0000-0000-0000-00000000000c' $$,
  array[10], 'se registraron exactamente 10 fallos'
);
set local role authenticated;

select lives_ok(
  $$ select public.join_space(repeat('a', 32), repeat('b', 64)) $$,
  'pasada la hora, C puede unirse con el secreto correcto'
);
select results_eq(
  $$ select count(*) from public.pull_records(repeat('a', 32), 0, 100) $$,
  array[2::bigint], 'C ya es miembro'
);

-- =============================================================================
-- 2.3.1 anon no puede ejecutar ninguna RPC ni leer tablas
-- =============================================================================
reset role;
select ok(not has_function_privilege('anon', 'public.create_space(text, text)', 'execute'), 'anon sin EXECUTE en create_space');
select ok(not has_function_privilege('anon', 'public.join_space(text, text)', 'execute'), 'anon sin EXECUTE en join_space');
select ok(not has_function_privilege('anon', 'public.push_records(text, jsonb)', 'execute'), 'anon sin EXECUTE en push_records');
select ok(not has_function_privilege('anon', 'public.pull_records(text, bigint, integer)', 'execute'), 'anon sin EXECUTE en pull_records');
select ok(not has_function_privilege('anon', 'public.delete_space(text)', 'execute'), 'anon sin EXECUTE en delete_space');

-- No se llama a las RPC como anon desde aquí: en la imagen local (postgres 17.6.1.106) un
-- "permission denied for function" con sesión de superusuario + SET ROLE tumba el servidor
-- (segfault). Por PostgREST no ocurre y anon recibe 401 (ver PROBLEMAS.md / RESUMEN.md).
select ok(not has_function_privilege('authenticated', 'public.enforce_space_quota()', 'execute'), 'nadie llama al trigger de cuota');
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select throws_ok($$ select * from public.sync_records $$, '42501', null, 'anon: sin SELECT en sync_records');

-- =============================================================================
-- 2.3.2 push_records: LWW por (version, version_by)
-- =============================================================================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a","role":"authenticated"}', true);

create temporary table seq_before on commit drop as
  select seq from public.sync_records where rid = repeat('1', 40);

select is(
  public.push_records(repeat('a', 32), jsonb_build_array(
    jsonb_build_object('rid', repeat('1', 40), 'version', 99, 'version_by', 'dev-z', 'payload', 'viejo'))),
  0, 'versión más antigua: no se aplica'
);
select results_eq(
  $$ select payload from public.sync_records where rid = repeat('1', 40) $$,
  array['cifrado-v100'], 'versión más antigua: no sobrescribe'
);
select is(
  public.push_records(repeat('a', 32), jsonb_build_array(
    jsonb_build_object('rid', repeat('1', 40), 'version', 100, 'version_by', 'dev-m', 'payload', 'igual'))),
  0, 'misma (version, version_by): no se aplica'
);
select is(
  public.push_records(repeat('a', 32), jsonb_build_array(
    jsonb_build_object('rid', repeat('1', 40), 'version', 101, 'version_by', 'dev-a', 'payload', 'cifrado-v101'))),
  1, 'versión más nueva: se aplica'
);
select results_eq(
  $$ select payload from public.sync_records where rid = repeat('1', 40) $$,
  array['cifrado-v101'], 'versión más nueva: sobrescribe'
);
select ok(
  (select seq from public.sync_records where rid = repeat('1', 40)) > (select seq from seq_before),
  'versión más nueva: sube seq'
);
select is(
  public.push_records(repeat('a', 32), jsonb_build_array(
    jsonb_build_object('rid', repeat('1', 40), 'version', 101, 'version_by', 'dev-0', 'payload', 'empate-menor'))),
  0, 'empate de version con version_by menor: no se aplica'
);
select is(
  public.push_records(repeat('a', 32), jsonb_build_array(
    jsonb_build_object('rid', repeat('1', 40), 'version', 101, 'version_by', 'dev-b', 'payload', 'empate-mayor'))),
  1, 'empate de version con version_by mayor: se aplica'
);
select results_eq(
  $$ select payload from public.sync_records where rid = repeat('1', 40) $$,
  array['empate-mayor'], 'empate de version: gana version_by mayor'
);

-- pull_records: orden por seq y p_limit acotado a [1, 500]
select results_eq(
  $$ select rid from public.pull_records(repeat('a', 32), 0, 100) $$,
  array[repeat('2', 40), repeat('1', 40)], 'pull ordena por seq'
);
select results_eq(
  $$ select count(*) from public.pull_records(repeat('a', 32), 0, 0) $$,
  array[1::bigint], 'p_limit < 1 se acota a 1'
);
select throws_ok(
  $$ select public.push_records(repeat('a', 32), (select jsonb_agg(jsonb_build_object('rid', lpad(g::text, 40, '0'), 'version', 1, 'version_by', 'x')) from generate_series(1, 501) g)) $$,
  '22023', null, 'push_records rechaza más de 500 registros'
);
select throws_ok(
  $$ select public.push_records(repeat('a', 32), jsonb_build_array(
       jsonb_build_object('rid', repeat('3', 40), 'version', 1, 'version_by', repeat('x', 65), 'payload', 'p'))) $$,
  '22023', null, 'push_records rechaza version_by de más de 64 caracteres'
);
select throws_ok(
  $$ select public.push_records(repeat('a', 32), jsonb_build_array(
       jsonb_build_object('rid', repeat('3', 40), 'version', 1, 'version_by', 'x', 'payload', null,
                          'blob_path', repeat('b', 32) || '/' || repeat('3', 40)))) $$,
  '22023', null, 'push_records rechaza un blob_path de otra familia'
);
select throws_ok(
  $$ select public.push_records(repeat('a', 32), jsonb_build_array(
       jsonb_build_object('rid', repeat('3', 40), 'version', 1, 'version_by', 'x', 'payload', null,
                          'blob_path', repeat('a', 32) || '/' || repeat('4', 40)))) $$,
  '22023', null, 'push_records rechaza un blob_path que no es el de su rid'
);

-- =============================================================================
-- 2.2.4 Cuota: máx. 20.000 filas por familia (las actualizaciones siguen funcionando)
-- =============================================================================
reset role;
insert into public.sync_records (space_id, rid, version, version_by, payload, seq)
select repeat('a', 32), lpad(g::text, 40, '0'), 1, 'x', 'p', nextval('public.sync_seq')
from generate_series(1, 19998) g;  -- 2 existentes + 19.998 = 20.000
set local role authenticated;

select throws_ok(
  $$ select public.push_records(repeat('a', 32), jsonb_build_array(
       jsonb_build_object('rid', repeat('n', 40), 'version', 1, 'version_by', 'x', 'payload', 'p'))) $$,
  '54000', null, 'la fila 20.001 se rechaza'
);
select is(
  public.push_records(repeat('a', 32), jsonb_build_array(
    jsonb_build_object('rid', repeat('1', 40), 'version', 200, 'version_by', 'x', 'payload', 'p'))),
  1, 'con la cuota llena, actualizar un registro existente sigue funcionando'
);

-- =============================================================================
-- delete_space: borra la familia en cascada y sus objetos de Storage
-- =============================================================================
select lives_ok($$ select public.delete_space(repeat('a', 32)) $$, 'A (miembro) borra la familia');
reset role;
select results_eq(
  $$ select (select count(*) from public.spaces) + (select count(*) from public.space_members)
          + (select count(*) from public.sync_records) + (select count(*) from public.join_attempts)
          + (select count(*) from storage.objects where bucket_id = 'sync-blobs') $$,
  array[0::bigint], 'delete_space no deja filas de la familia ni objetos'
);

select * from finish();
rollback;
