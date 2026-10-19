-- =====================================================================
-- قاعدة بيانات بوابة سكن جروب على Supabase
-- ---------------------------------------------------------------------
-- بيتشغّل مرة واحدة: Supabase ← SQL Editor ← New query ← الصق الملف كله ← Run.
-- تشغيله تاني آمن: مابيمسحش داتا، وبيحدّث الدوال بس.
--
-- الأمان: الجداول كلها مقفولة (RLS من غير أي policy)، والمتصفح مايقدرش
-- يقرا أو يكتب فيها مباشرة. كل حاجة بتعدّي على الدالة sakan_api، وهي اللي
-- بتتأكد من الجلسة والصلاحيات على السيرفر. كلمات المرور bcrypt.
--
-- مدير النظام الأول: admin وكلمة المرور تحت. غيّرها قبل التشغيل، أو
-- غيّرها من البرنامج أول ما تدخل.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists sakan_staff (
  ukey text primary key,               -- اسم المستخدم lowercase
  doc jsonb not null,                  -- {username, name, role, perms, createdAt}
  pass text not null
);
create table if not exists sakan_owners (
  id text primary key,
  ukey text unique not null,
  doc jsonb not null,                  -- {id, name, username, perms, engineer, createdAt, createdBy, updatedAt}
  pass text not null
);
create table if not exists sakan_projects (
  id text primary key,
  owner_id text not null references sakan_owners(id) on delete cascade,
  doc jsonb not null                   -- نفس شكل المشروع في portal-api.js
);
create table if not exists sakan_plans (
  id text primary key,
  doc jsonb not null,                  -- المخطط من غير الصورة
  updated bigint not null default 0
);
create table if not exists sakan_files (
  id text primary key,
  project_id text not null references sakan_projects(id) on delete cascade,
  meta jsonb not null
);
-- الحاجات الكبيرة (صورة المخطط والملفات) بتتقسم أجزاء عشان حجم الطلب
create table if not exists sakan_chunks (
  kind text not null,                  -- plan | file | up (رفع لسه ماخلصش)
  ref text not null,
  seq int not null,
  data text not null,
  created_at timestamptz not null default now(),
  primary key (kind, ref, seq)
);
create table if not exists sakan_log (
  id bigserial primary key,
  project_id text,
  entry jsonb not null
);
create index if not exists sakan_log_project on sakan_log (project_id);
create table if not exists sakan_seen (
  ukey text not null,
  project_id text not null,
  at text not null,
  primary key (ukey, project_id)
);
create table if not exists sakan_sessions (
  token text primary key,
  kind text not null,                  -- staff | owner
  ukey text not null,
  expires timestamptz not null
);
create table if not exists sakan_login_fail (
  ukey text primary key,
  count int not null default 0,
  until timestamptz
);

do $$ declare t text; begin
  foreach t in array array['sakan_staff','sakan_owners','sakan_projects','sakan_plans','sakan_files','sakan_chunks','sakan_log','sakan_seen','sakan_sessions','sakan_login_fail'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public, anon, authenticated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- مساعدات
create or replace function sakan_now() returns text language sql stable as
$$ select to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') $$;

create or replace function sakan_uid(p text) returns text language sql volatile as
$$ select p || '-' || gen_random_uuid()::text $$;

create or replace function sakan_perms(defaults jsonb, given jsonb) returns jsonb language sql immutable as $$
  select coalesce(jsonb_object_agg(k, case when given ? k then (given->>k)::boolean else (defaults->>k)::boolean end), '{}'::jsonb)
  from jsonb_object_keys(defaults) k
$$;

create or replace function sakan_engineer_perms() returns jsonb language sql immutable as
$$ select '{"manageOwners":true,"manageProjects":true,"manageFiles":false,"deleteItems":false,"viewLog":true}'::jsonb $$;
create or replace function sakan_client_perms() returns jsonb language sql immutable as
$$ select '{"edit":true,"final":true,"send":true}'::jsonb $$;

create or replace function sakan_hash(pw text) returns text language sql volatile
set search_path = public, extensions as
$$ select extensions.crypt(pw, extensions.gen_salt('bf', 10)) $$;

create or replace function sakan_check(pw text, h text) returns boolean language sql stable
set search_path = public, extensions as
$$ select h = extensions.crypt(pw, h) $$;

-- المستخدم الحالي من التوكن: {role, username, name, ownerId?, perms}
create or replace function sakan_me(tok text) returns jsonb language plpgsql stable as $$
declare s sakan_sessions; d jsonb;
begin
  select * into s from sakan_sessions where token = tok and expires > now();
  if not found then return null; end if;
  if s.kind = 'staff' then
    select doc into d from sakan_staff where ukey = s.ukey;
    if d is null then return null; end if;
    return jsonb_build_object('role', d->>'role', 'username', d->>'username', 'name', coalesce(nullif(d->>'name',''), d->>'username'),
      'perms', case when d->>'role' = 'admin' then '{}'::jsonb else sakan_perms(sakan_engineer_perms(), d->'perms') end);
  end if;
  select doc into d from sakan_owners where ukey = s.ukey;
  if d is null then return null; end if;
  return jsonb_build_object('role', 'client', 'username', d->>'username', 'name', d->>'name', 'ownerId', d->>'id',
    'perms', sakan_perms(sakan_client_perms(), d->'perms'));
end $$;

create or replace function sakan_can(me jsonb, perm text) returns boolean language sql immutable as
$$ select me->>'role' = 'admin' or coalesce((me->'perms'->>perm)::boolean, false) $$;

create or replace function sakan_staff_name(u text) returns text language sql stable as
$$ select coalesce((select doc->>'name' from sakan_staff where ukey = lower(coalesce(u,''))), '') $$;

create or replace function sakan_responsible(p sakan_projects) returns text language sql stable as $$
  select coalesce(nullif(p.doc->>'engineer',''), nullif((select doc->>'engineer' from sakan_owners where id = p.owner_id),''), '')
$$;

create or replace function sakan_sees(me jsonb, p sakan_projects) returns boolean language sql stable as $$
  select case me->>'role'
    when 'admin' then true
    when 'engineer' then sakan_responsible(p) = '' or lower(sakan_responsible(p)) = lower(me->>'username')
    else p.owner_id = me->>'ownerId' end
$$;

create or replace function sakan_public_owner(o sakan_owners) returns jsonb language sql stable as $$
  select jsonb_build_object('id', o.id, 'name', o.doc->>'name', 'username', o.doc->>'username',
    'perms', sakan_perms(sakan_client_perms(), o.doc->'perms'), 'engineer', coalesce(o.doc->>'engineer',''),
    'engineerName', sakan_staff_name(o.doc->>'engineer'), 'createdAt', o.doc->'createdAt',
    'projects', (select count(*) from sakan_projects where owner_id = o.id))
$$;

create or replace function sakan_public_project(p sakan_projects) returns jsonb language sql stable as $$
  select p.doc || jsonb_build_object('ownerName', coalesce(o.doc->>'name',''), 'ownerUsername', coalesce(o.doc->>'username',''),
    'engineer', coalesce(p.doc->>'engineer',''), 'responsible', sakan_responsible(p), 'responsibleName', sakan_staff_name(sakan_responsible(p)))
  from (select 1) x left join sakan_owners o on o.id = p.owner_id
$$;

create or replace function sakan_username_taken(u text, except_owner text) returns boolean language sql stable as $$
  select exists (select 1 from sakan_staff where ukey = lower(trim(u)))
      or exists (select 1 from sakan_owners where ukey = lower(trim(u)) and id is distinct from except_owner)
$$;

-- المستخدم اللي بيعمل الحاجة، من الجلسة نفسها مش من المتصفح
create or replace function sakan_by(me jsonb) returns jsonb language sql immutable as
$$ select jsonb_build_object('username', me->>'username', 'name', me->>'name', 'role', me->>'role') $$;

create or replace function sakan_err(msg text) returns void language plpgsql as
$$ begin raise exception using errcode = 'P0001', message = msg; end $$;

-- ---------------------------------------------------------------- الواجهة الوحيدة
create or replace function sakan_api(token text, op text, args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer
set search_path = public, extensions as $$
declare
  me jsonb; p sakan_projects; o sakan_owners; s sakan_staff; r record;
  v text; v2 text; n int; out jsonb; d jsonb; tok text; ok boolean;
  uname_re constant text := '^[A-Za-z0-9._-]{3,30}$';
begin
  args := coalesce(args, '{}'::jsonb);

  -- ---------- من غير جلسة ----------
  if op = 'login' then
    v := lower(trim(coalesce(args->>'username','')));
    select * into r from sakan_login_fail where ukey = v;
    if found and r.until is not null and r.until > now() then
      perform sakan_err('محاولات دخول خاطئة كثيرة. انتظر 10 دقائق وحاول مرة أخرى.');
    end if;
    select * into s from sakan_staff where ukey = v;
    if found then ok := sakan_check(coalesce(args->>'password',''), s.pass); v2 := 'staff';
    else
      select * into o from sakan_owners where ukey = v;
      if found then ok := sakan_check(coalesce(args->>'password',''), o.pass); v2 := 'owner'; else ok := false; end if;
    end if;
    if not ok then
      insert into sakan_login_fail (ukey, count) values (v, 1)
        on conflict (ukey) do update set count = case when sakan_login_fail.until is not null and sakan_login_fail.until <= now() then 1 else sakan_login_fail.count + 1 end,
          until = case when sakan_login_fail.count + 1 >= 10 then now() + interval '10 minutes' else null end;
      return null;
    end if;
    delete from sakan_login_fail where ukey = v;
    delete from sakan_sessions where expires < now();
    tok := encode(extensions.gen_random_bytes(32), 'hex');
    insert into sakan_sessions values (tok, v2, v, now() + interval '30 days');
    return jsonb_build_object('token', tok, 'user', sakan_me(tok));
  end if;

  me := sakan_me(token);
  if me is null then perform sakan_err('SESSION'); end if;
  -- الجلسة بتتجدد طول ما المستخدم شغال
  update sakan_sessions set expires = now() + interval '30 days' where sakan_sessions.token = sakan_api.token and expires < now() + interval '29 days';

  if op = 'whoami' then return me; end if;
  if op = 'logout' then delete from sakan_sessions where sakan_sessions.token = sakan_api.token; return null; end if;

  -- ---------- الملّاك ----------
  if op = 'listOwners' then
    if me->>'role' = 'client' then perform sakan_err('غير مسموح.'); end if;
    return coalesce((select jsonb_agg(sakan_public_owner(x) order by x.doc->>'name') from sakan_owners x), '[]'::jsonb);
  end if;

  if op = 'saveOwner' then
    if not sakan_can(me, 'manageOwners') then perform sakan_err('غير مسموح لك بتعديل الملّاك.'); end if;
    d := args->'data';
    v := trim(coalesce(d->>'name','')); v2 := trim(coalesce(d->>'username',''));
    if v = '' then perform sakan_err('اكتب اسم المالك.'); end if;
    if v2 !~ uname_re then perform sakan_err('يتكون اسم المستخدم من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا (مسموح . _ -).'); end if;
    if coalesce(d->>'id','') <> '' then select * into o from sakan_owners where id = d->>'id'; end if;
    if sakan_username_taken(v2, o.id) then perform sakan_err('اسم المستخدم هذا مستخدم من قبل. اختر اسمًا آخر.'); end if;
    if (o.id is null or coalesce(d->>'password','') <> '') and length(coalesce(d->>'password','')) < 4 then perform sakan_err('يجب ألا تقل كلمة المرور عن 4 حروف أو أرقام.'); end if;
    if o.id is not null and o.ukey <> lower(v2) and coalesce(d->>'password','') = '' then perform sakan_err('عند تغيير اسم المستخدم اكتب كلمة مرور جديدة أيضًا.'); end if;
    if o.id is null then
      o.id := sakan_uid('own');
      o.doc := jsonb_build_object('id', o.id, 'createdAt', sakan_now(), 'createdBy', sakan_by(me), 'perms', sakan_client_perms());
    end if;
    o.doc := o.doc || jsonb_build_object('name', v, 'username', v2, 'updatedAt', sakan_now());
    -- المدير بس اللي بيحدد الصلاحيات والمهندس المسؤول
    if me->>'role' = 'admin' and d ? 'perms' and jsonb_typeof(d->'perms') = 'object' then o.doc := o.doc || jsonb_build_object('perms', sakan_perms(sakan_client_perms(), d->'perms')); end if;
    if me->>'role' = 'admin' and d ? 'engineer' and jsonb_typeof(d->'engineer') <> 'null' then o.doc := o.doc || jsonb_build_object('engineer', coalesce(d->>'engineer','')); end if;
    if coalesce(d->>'password','') <> '' then o.pass := sakan_hash(d->>'password'); end if;
    insert into sakan_owners (id, ukey, doc, pass) values (o.id, lower(v2), o.doc, o.pass)
      on conflict (id) do update set ukey = excluded.ukey, doc = excluded.doc, pass = excluded.pass;
    if o.ukey is not null and o.ukey <> lower(v2) then delete from sakan_sessions where ukey = o.ukey and kind = 'owner'; end if;
    select * into o from sakan_owners where id = o.id;
    return sakan_public_owner(o);
  end if;

  if op = 'deleteOwner' then
    if not (sakan_can(me, 'manageOwners') and sakan_can(me, 'deleteItems')) then perform sakan_err('غير مسموح لك بالحذف.'); end if;
    select * into o from sakan_owners where id = args->>'id';
    if found then
      delete from sakan_chunks where kind = 'file' and ref in (select f.id from sakan_files f join sakan_projects x on x.id = f.project_id where x.owner_id = o.id);
      delete from sakan_sessions where ukey = o.ukey and kind = 'owner';
      delete from sakan_owners where id = o.id;
    end if;
    return null;
  end if;

  -- ---------- المشاريع ----------
  if op = 'listProjects' then
    return coalesce((select jsonb_agg(sakan_public_project(x) order by x.doc->>'updatedAt' desc nulls last)
      from sakan_projects x where sakan_sees(me, x) and (coalesce(args->>'ownerId','') = '' or x.owner_id = args->>'ownerId')), '[]'::jsonb);
  end if;

  -- كل العمليات اللي على مشروع واحد
  if op in ('getProject','deleteProject','saveWork','approveWork','requestEdit','resolveEdit','reopenWork','addComment','markSeen','saveProposal','sendReport','listFiles','addFile') then
    select * into p from sakan_projects where id = coalesce(args->>'id', args->>'projectId');
    if not found or not sakan_sees(me, p) then
      if op = 'getProject' then return null; end if;
      perform sakan_err('المشروع غير موجود.');
    end if;
  end if;

  if op = 'getProject' then return sakan_public_project(p); end if;

  if op = 'saveProject' then
    if not sakan_can(me, 'manageProjects') then perform sakan_err('غير مسموح لك بتعديل المشاريع.'); end if;
    d := args->'data';
    v := trim(coalesce(d->>'name',''));
    if v = '' then perform sakan_err('اكتب اسم المشروع.'); end if;
    if not exists (select 1 from sakan_owners where id = d->>'ownerId') then perform sakan_err('اختر مالك المشروع.'); end if;
    if coalesce(d->>'planId','') = '' then perform sakan_err('اختر مخطط المشروع.'); end if;
    if coalesce(d->>'id','') <> '' then
      select * into p from sakan_projects where id = d->>'id';
      if found and not sakan_sees(me, p) then perform sakan_err('المشروع غير موجود.'); end if;
    end if;
    if p.id is null then
      p.id := sakan_uid('prj');
      p.doc := jsonb_build_object('id', p.id, 'createdAt', sakan_now(), 'createdBy', sakan_by(me), 'work', '{"selections":{},"notes":""}'::jsonb, 'proposals', '{}'::jsonb, 'reports', '[]'::jsonb);
    end if;
    p.owner_id := d->>'ownerId';
    p.doc := p.doc || jsonb_build_object('name', v, 'ownerId', p.owner_id, 'planId', d->>'planId', 'planTitle', coalesce(d->>'planTitle',''), 'updatedAt', sakan_now());
    if me->>'role' = 'admin' and d ? 'engineer' and jsonb_typeof(d->'engineer') <> 'null' then p.doc := p.doc || jsonb_build_object('engineer', coalesce(d->>'engineer','')); end if;
    insert into sakan_projects values (p.id, p.owner_id, p.doc) on conflict (id) do update set owner_id = excluded.owner_id, doc = excluded.doc;
    return sakan_public_project(p);
  end if;

  if op = 'deleteProject' then
    if not (sakan_can(me, 'manageProjects') and sakan_can(me, 'deleteItems')) then perform sakan_err('غير مسموح لك بالحذف.'); end if;
    delete from sakan_chunks where kind = 'file' and ref in (select id from sakan_files where project_id = p.id);
    delete from sakan_projects where id = p.id;
    return null;
  end if;

  if op = 'saveWork' then
    if me->>'role' = 'client' and not sakan_can(me, 'edit') then perform sakan_err('غير مسموح لك بتعديل الاختيارات.'); end if;
    if p.doc->'work'->>'status' = 'approved' then perform sakan_err('الاختيارات معتمدة ومقفلة. اطلب من مدير النظام السماح بالتعديل.'); end if;
    d := args->'work';
    v := sakan_now();
    -- التقسيمات المخصصة (صور يرفعها المستخدم) بتتحفظ مع الاختيارات، بحد أقصى 60 تقسيمة و6 ميجا
    if jsonb_typeof(d->'custom') = 'array' and (jsonb_array_length(d->'custom') > 60 or octet_length((d->'custom')::text) > 6000000) then perform sakan_err('التقسيمات المخصصة كثيرة أو صورها كبيرة جدًا.'); end if;
    p.doc := p.doc || jsonb_build_object('work', jsonb_build_object('selections', coalesce(d->'selections','{}'::jsonb), 'notes', coalesce(d->>'notes',''),
      'custom', case when jsonb_typeof(d->'custom') = 'array' then d->'custom' else coalesce(p.doc->'work'->'custom','[]'::jsonb) end,
      'status', 'draft', 'updatedAt', v, 'updatedBy', sakan_by(me)), 'updatedAt', v);
  elsif op = 'approveWork' then
    if me->>'role' = 'client' and not sakan_can(me, 'final') then perform sakan_err('غير مسموح لك بالاعتماد.'); end if;
    p.doc := p.doc || jsonb_build_object('work', '{"selections":{},"notes":""}'::jsonb || coalesce(p.doc->'work','{}'::jsonb) || jsonb_build_object('status','approved','approvedAt',sakan_now(),'approvedBy',sakan_by(me)), 'updatedAt', sakan_now());
  elsif op = 'requestEdit' then
    if coalesce(p.doc->'work'->>'status','') <> 'approved' then perform sakan_err('الاختيارات ما زالت مسودة، ويمكنك تعديلها.'); end if;
    if p.doc->'editRequest'->>'status' = 'pending' then perform sakan_err('يوجد طلب تعديل بانتظار الموافقة.'); end if;
    p.doc := p.doc || jsonb_build_object('editRequest', jsonb_build_object('status','pending','reason',left(trim(coalesce(args->>'reason','')),500),'at',sakan_now(),'by',sakan_by(me)), 'updatedAt', sakan_now());
  elsif op = 'resolveEdit' then
    if me->>'role' <> 'admin' then perform sakan_err('هذا متاح لمدير النظام فقط.'); end if;
    if coalesce(p.doc->'editRequest'->>'status','') <> 'pending' then perform sakan_err('لا يوجد طلب تعديل.'); end if;
    ok := coalesce((args->>'allow')::boolean, false);
    p.doc := p.doc || jsonb_build_object('editRequest', (p.doc->'editRequest') || jsonb_build_object('status', case when ok then 'allowed' else 'rejected' end, 'resolvedAt', sakan_now(), 'resolvedBy', sakan_by(me)), 'updatedAt', sakan_now());
    if ok then p.doc := p.doc || jsonb_build_object('work', '{"selections":{},"notes":""}'::jsonb || coalesce(p.doc->'work','{}'::jsonb) || jsonb_build_object('status','draft','reopenedAt',sakan_now(),'reopenedBy',sakan_by(me))); end if;
  elsif op = 'reopenWork' then
    if me->>'role' <> 'admin' then perform sakan_err('هذا متاح لمدير النظام فقط.'); end if;
    p.doc := p.doc || jsonb_build_object('work', '{"selections":{},"notes":""}'::jsonb || coalesce(p.doc->'work','{}'::jsonb) || jsonb_build_object('status','draft','reopenedAt',sakan_now(),'reopenedBy',sakan_by(me)), 'updatedAt', sakan_now());
  elsif op = 'addComment' then
    v := left(trim(coalesce(args->>'text','')), 2000);
    if v = '' then perform sakan_err('اكتب التعليق أولًا.'); end if;
    p.doc := p.doc || jsonb_build_object('comments', coalesce(p.doc->'comments','[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', sakan_uid('cmt'), 'text', v, 'at', sakan_now(), 'by', sakan_by(me))), 'updatedAt', sakan_now());
    insert into sakan_seen values (lower(me->>'username'), p.id, sakan_now()) on conflict (ukey, project_id) do update set at = excluded.at;
  elsif op = 'markSeen' then
    insert into sakan_seen values (lower(me->>'username'), p.id, sakan_now()) on conflict (ukey, project_id) do update set at = excluded.at;
    return null;
  elsif op = 'saveProposal' then
    v := args->>'slot';
    if v not in ('p1','p2','final') then perform sakan_err('مقترح غير معروف.'); end if;
    if me->>'role' = 'client' and (not sakan_can(me, 'edit') or (v = 'final' and not sakan_can(me, 'final'))) then perform sakan_err('غير مسموح لك بحفظ هذا المقترح.'); end if;
    d := args->'data';
    p.doc := p.doc || jsonb_build_object('proposals', coalesce(p.doc->'proposals','{}'::jsonb) || jsonb_build_object(v, jsonb_build_object('selections', coalesce(d->'selections','{}'::jsonb), 'notes', coalesce(d->>'notes',''), 'savedAt', sakan_now(), 'savedBy', sakan_by(me))), 'updatedAt', sakan_now());
  elsif op = 'sendReport' then
    if me->>'role' = 'client' and not sakan_can(me, 'send') then perform sakan_err('غير مسموح لك بإرسال التقرير.'); end if;
    d := args->'data';
    p.doc := p.doc || jsonb_build_object('reports', coalesce(p.doc->'reports','[]'::jsonb) || jsonb_build_array(jsonb_build_object('slot', d->'slot', 'number', d->'number', 'sentAt', sakan_now(), 'sentBy', sakan_by(me))));
  end if;
  if op in ('saveWork','approveWork','requestEdit','resolveEdit','reopenWork','addComment','saveProposal','sendReport') then
    update sakan_projects set doc = p.doc where id = p.id;
    return sakan_public_project(p);
  end if;

  -- ---------- الإشعارات ----------
  if op = 'listNotifications' then
    out := '[]'::jsonb;
    for p in select * from sakan_projects x where sakan_sees(me, x) loop
      select at into v from sakan_seen where ukey = lower(me->>'username') and project_id = p.id;
      v := coalesce(v, '');
      select doc->>'name' into v2 from sakan_owners where id = p.owner_id;
      d := '[]'::jsonb;
      d := d || coalesce((select jsonb_agg(jsonb_build_object('kind','comment','at',c->>'at','by',c->'by','text',c->>'text')) from jsonb_array_elements(coalesce(p.doc->'comments','[]'::jsonb)) c), '[]'::jsonb);
      if me->>'role' <> 'client' then
        d := d || coalesce((select jsonb_agg(jsonb_build_object('kind','report','at',r2->>'sentAt','by',r2->'sentBy','text',r2->>'slot')) from jsonb_array_elements(coalesce(p.doc->'reports','[]'::jsonb)) r2), '[]'::jsonb);
        if p.doc->'work'->>'status' = 'approved' and p.doc->'work' ? 'approvedAt' then
          d := d || jsonb_build_array(jsonb_build_object('kind','approved','at',p.doc->'work'->>'approvedAt','by',p.doc->'work'->'approvedBy','text',''));
        end if;
      end if;
      if p.doc->'editRequest'->>'status' = 'pending' and me->>'role' = 'admin' then
        d := d || jsonb_build_array(jsonb_build_object('kind','editRequest','at',p.doc->'editRequest'->>'at','by',p.doc->'editRequest'->'by','text',p.doc->'editRequest'->>'reason'));
      end if;
      if coalesce(p.doc->'editRequest'->>'status','pending') <> 'pending' and me->>'role' = 'client' then
        d := d || jsonb_build_array(jsonb_build_object('kind', case when p.doc->'editRequest'->>'status' = 'allowed' then 'editAllowed' else 'editRejected' end,
          'at',p.doc->'editRequest'->>'resolvedAt','by',p.doc->'editRequest'->'resolvedBy','text',''));
      end if;
      out := out || coalesce((select jsonb_agg(e || jsonb_build_object('projectId', p.id, 'projectName', p.doc->>'name', 'ownerName', coalesce(v2,'')))
        from jsonb_array_elements(d) e
        where e->>'at' > v and jsonb_typeof(e->'by') = 'object' and lower(e->'by'->>'username') <> lower(me->>'username')), '[]'::jsonb);
    end loop;
    return coalesce((select jsonb_agg(e order by e->>'at' desc) from jsonb_array_elements(out) e), '[]'::jsonb);
  end if;

  -- ---------- رفع الحاجات الكبيرة على أجزاء ----------
  if op = 'chunk' then
    v := coalesce(args->>'upload','');
    if v !~ '^up-[0-9a-f-]{36}$' then perform sakan_err('رفع غير صالح.'); end if;
    if length(coalesce(args->>'data','')) > 3000000 then perform sakan_err('الجزء كبير جدًا.'); end if;
    -- الرفع بتاع المستخدم ده بس (اسم المستخدم جوه رقم الرفع على السيرفر)
    insert into sakan_chunks (kind, ref, seq, data) values ('up', v || ':' || lower(me->>'username'), (args->>'seq')::int, args->>'data')
      on conflict (kind, ref, seq) do update set data = excluded.data;
    delete from sakan_chunks where kind = 'up' and created_at < now() - interval '1 day';
    return null;
  end if;

  -- ---------- ملفات المشروع ----------
  if op = 'listFiles' then
    return coalesce((select jsonb_agg(meta order by meta->>'addedAt' desc) from sakan_files where project_id = p.id), '[]'::jsonb);
  end if;
  if op = 'addFile' then
    if not (me->>'role' = 'admin' or (me->>'role' = 'engineer' and sakan_can(me, 'manageFiles'))) then perform sakan_err('غير مسموح لك برفع الملفات.'); end if;
    d := args->'meta';
    if coalesce((d->>'size')::bigint, 0) > 25 * 1024 * 1024 then perform sakan_err('الملف أكبر من 25 ميجابايت.'); end if;
    if coalesce(d->>'category','') not in ('plans','designs','minutes') then perform sakan_err('نوع الملف غير معروف.'); end if;
    v := sakan_uid('file');
    v2 := (args->>'upload') || ':' || lower(me->>'username');
    if not exists (select 1 from sakan_chunks where kind = 'up' and ref = v2) then perform sakan_err('لم يُرفع الملف بالكامل. حاول مرة أخرى.'); end if;
    update sakan_chunks set kind = 'file', ref = v where kind = 'up' and ref = v2;
    d := jsonb_build_object('id', v, 'projectId', p.id, 'category', d->>'category', 'name', left(coalesce(d->>'name','ملف'),200),
      'type', coalesce(nullif(d->>'type',''),'application/octet-stream'), 'size', coalesce((d->>'size')::bigint,0), 'addedAt', sakan_now(), 'addedBy', sakan_by(me));
    insert into sakan_files values (v, p.id, d);
    return d;
  end if;
  if op in ('getFile','deleteFile') then
    select f.*, x.* into r from sakan_files f join sakan_projects x on x.id = f.project_id where f.id = args->>'id';
    if not found then return null; end if;
    select * into p from sakan_projects where id = r.project_id;
    if not sakan_sees(me, p) then return null; end if;
    if op = 'getFile' then
      return jsonb_build_object('meta', r.meta, 'chunks', (select count(*) from sakan_chunks where kind = 'file' and ref = r.id));
    end if;
    if not ((me->>'role' = 'admin' or (me->>'role' = 'engineer' and sakan_can(me, 'manageFiles'))) and sakan_can(me, 'deleteItems')) then perform sakan_err('غير مسموح لك بالحذف.'); end if;
    delete from sakan_chunks where kind = 'file' and ref = r.id;
    delete from sakan_files where id = r.id;
    return null;
  end if;
  if op = 'readChunk' then
    -- kind = file | plan
    v := args->>'ref';
    if args->>'kind' = 'file' then
      select x.* into p from sakan_files f join sakan_projects x on x.id = f.project_id where f.id = v;
      if not found or not sakan_sees(me, p) then perform sakan_err('الملف غير موجود.'); end if;
    elsif args->>'kind' = 'plan' then
      if me->>'role' = 'client' and not exists (select 1 from sakan_projects x where x.owner_id = me->>'ownerId' and x.doc->>'planId' = v) then perform sakan_err('المخطط غير موجود.'); end if;
    else perform sakan_err('غير معروف.'); end if;
    return to_jsonb((select data from sakan_chunks where kind = args->>'kind' and ref = v and seq = (args->>'seq')::int));
  end if;

  -- ---------- المخططات ----------
  if op = 'listPlans' then
    -- العميل بياخد مخططات مشاريعه بس
    return coalesce((select jsonb_agg(x.doc || jsonb_build_object('imageChunks', (select count(*) from sakan_chunks c where c.kind = 'plan' and c.ref = x.id)) order by x.updated desc)
      from sakan_plans x
      where me->>'role' <> 'client' or exists (select 1 from sakan_projects y where y.owner_id = me->>'ownerId' and y.doc->>'planId' = x.id)), '[]'::jsonb);
  end if;
  if op = 'putPlan' then
    if not sakan_can(me, 'manageProjects') then perform sakan_err('غير مسموح لك بتعديل المخططات.'); end if;
    d := args->'plan';
    v := d->>'id';
    if v !~ '^plan-[a-zA-Z0-9_-]{1,70}$' then perform sakan_err('مخطط غير صالح.'); end if;
    if coalesce(args->>'upload','') <> '' then
      v2 := (args->>'upload') || ':' || lower(me->>'username');
      if not exists (select 1 from sakan_chunks where kind = 'up' and ref = v2) then perform sakan_err('لم تُرفع صورة المخطط بالكامل. حاول مرة أخرى.'); end if;
      delete from sakan_chunks where kind = 'plan' and ref = v;
      update sakan_chunks set kind = 'plan', ref = v where kind = 'up' and ref = v2;
    end if;
    insert into sakan_plans values (v, d - 'image', coalesce((d->>'updated')::bigint, 0))
      on conflict (id) do update set doc = excluded.doc, updated = excluded.updated;
    return null;
  end if;
  if op = 'removePlan' then
    if not sakan_can(me, 'deleteItems') then perform sakan_err('غير مسموح لك بالحذف.'); end if;
    delete from sakan_chunks where kind = 'plan' and ref = args->>'id';
    delete from sakan_plans where id = args->>'id';
    return null;
  end if;

  -- ---------- المهندسين ومديري النظام (للمدير بس) ----------
  if op = 'listStaff' then
    if me->>'role' = 'client' then perform sakan_err('غير مسموح.'); end if;
    -- المهندس بيحتاج القايمة عشان أسماء المهندسين، من غير الصلاحيات
    return coalesce((select jsonb_agg(jsonb_build_object('username', doc->>'username', 'name', doc->>'name', 'role', doc->>'role',
        'perms', case when doc->>'role' = 'admin' or me->>'role' <> 'admin' then null else sakan_perms(sakan_engineer_perms(), doc->'perms') end, 'createdAt', doc->'createdAt') order by doc->>'createdAt')
      from sakan_staff), '[]'::jsonb);
  end if;
  if op = 'saveStaff' then
    if me->>'role' <> 'admin' then perform sakan_err('هذا متاح لمدير النظام فقط.'); end if;
    d := args->'data';
    v := trim(coalesce(d->>'username','')); v2 := trim(coalesce(d->>'name',''));
    if coalesce(d->>'original','') <> '' then select * into s from sakan_staff where ukey = lower(d->>'original'); end if;
    if v2 = '' then perform sakan_err('اكتب الاسم.'); end if;
    if v !~ uname_re then perform sakan_err('يتكون اسم المستخدم من 3 إلى 30 حرفًا إنجليزيًا أو رقمًا (مسموح . _ -).'); end if;
    if exists (select 1 from sakan_owners where ukey = lower(v)) or exists (select 1 from sakan_staff where ukey = lower(v) and ukey is distinct from s.ukey) then perform sakan_err('اسم المستخدم هذا مستخدم من قبل. اختر اسمًا آخر.'); end if;
    if (s.ukey is null or coalesce(d->>'password','') <> '') and length(coalesce(d->>'password','')) < 4 then perform sakan_err('يجب ألا تقل كلمة المرور عن 4 حروف أو أرقام.'); end if;
    if s.ukey is not null and s.ukey <> lower(v) and coalesce(d->>'password','') = '' then perform sakan_err('عند تغيير اسم المستخدم اكتب كلمة مرور جديدة أيضًا.'); end if;
    v := v; tok := case when d->>'role' = 'admin' then 'admin' else 'engineer' end;
    if s.ukey is not null and s.doc->>'role' = 'admin' and tok <> 'admin' and (select count(*) from sakan_staff where doc->>'role' = 'admin') = 1 then perform sakan_err('يجب أن يبقى مدير نظام واحد على الأقل.'); end if;
    out := coalesce(s.doc, jsonb_build_object('createdAt', sakan_now())) || jsonb_build_object('name', v2, 'username', v, 'role', tok);
    out := case when tok = 'admin' then out - 'perms' else out || jsonb_build_object('perms', sakan_perms(sakan_engineer_perms(), coalesce(d->'perms', s.doc->'perms'))) end;
    if s.ukey is not null and s.ukey <> lower(v) then
      update sakan_staff set ukey = lower(v), doc = out, pass = case when coalesce(d->>'password','') <> '' then sakan_hash(d->>'password') else pass end where ukey = s.ukey;
      delete from sakan_sessions where ukey = s.ukey and kind = 'staff';
    elsif s.ukey is not null then
      update sakan_staff set doc = out, pass = case when coalesce(d->>'password','') <> '' then sakan_hash(d->>'password') else pass end where ukey = s.ukey;
    else
      insert into sakan_staff values (lower(v), out, sakan_hash(d->>'password'));
    end if;
    return null;
  end if;
  if op = 'deleteStaff' then
    if me->>'role' <> 'admin' then perform sakan_err('هذا متاح لمدير النظام فقط.'); end if;
    select * into s from sakan_staff where ukey = lower(args->>'username');
    if not found then return null; end if;
    if s.doc->>'role' = 'admin' and (select count(*) from sakan_staff where doc->>'role' = 'admin') = 1 then perform sakan_err('يجب أن يبقى مدير نظام واحد على الأقل.'); end if;
    delete from sakan_staff where ukey = s.ukey;
    delete from sakan_sessions where ukey = s.ukey and kind = 'staff';
    return null;
  end if;
  if op = 'changePassword' then
    v := coalesce(args->>'password','');
    if length(v) < 4 then perform sakan_err('يجب ألا تقل كلمة المرور عن 4 حروف أو أرقام.'); end if;
    v2 := lower(coalesce(args->>'username',''));
    -- كل واحد بيغيّر بتاعته، والمدير يقدر يغيّر لأي حد
    if v2 <> lower(me->>'username') and me->>'role' <> 'admin' then perform sakan_err('غير مسموح.'); end if;
    update sakan_staff set pass = sakan_hash(v) where ukey = v2;
    get diagnostics n = row_count;
    if n = 0 then update sakan_owners set pass = sakan_hash(v) where ukey = v2; get diagnostics n = row_count; end if;
    if n = 0 then perform sakan_err('الحساب غير موجود.'); end if;
    return null;
  end if;

  -- ---------- سجل التعديلات ----------
  if op = 'addLog' then
    d := args->'entry';
    -- مين وإمتى بيتاخدوا من الجلسة، مش من المتصفح
    insert into sakan_log (project_id, entry) values (nullif(d->>'projectId',''),
      jsonb_build_object('id', sakan_uid('log'), 'at', sakan_now(), 'username', me->>'username', 'name', me->>'name', 'role', me->>'role',
        'projectId', d->'projectId', 'projectName', left(coalesce(d->>'projectName',''),200), 'action', left(coalesce(d->>'action',''),200), 'details', left(coalesce(d->>'details',''),1000)));
    return null;
  end if;
  if op = 'listLog' then
    if not sakan_can(me, 'viewLog') then perform sakan_err('غير مسموح لك بالاطلاع على السجل.'); end if;
    return coalesce((select jsonb_agg(entry order by id desc) from (select * from sakan_log where coalesce(args->>'projectId','') = '' or project_id = args->>'projectId' order by id desc limit 5000) l), '[]'::jsonb);
  end if;

  perform sakan_err('عملية غير معروفة: ' || op);
end $$;

-- الدوال المساعدة بتتنادى من جوه sakan_api بس، ومحدش من برا يناديها
do $$ declare f record; begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'sakan\_%' and p.proname <> 'sakan_api' loop
    execute format('alter function %s set search_path = public, extensions', f.sig);
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

revoke all on function sakan_api(text, text, jsonb) from public;
grant execute on function sakan_api(text, text, jsonb) to anon, authenticated;

-- مدير النظام الأول (مرة واحدة بس، لو مفيش أي حساب)
insert into sakan_staff (ukey, doc, pass)
select 'admin', jsonb_build_object('username','admin','name','مدير النظام','role','admin','createdAt',sakan_now()), sakan_hash('sakan123')
where not exists (select 1 from sakan_staff);
