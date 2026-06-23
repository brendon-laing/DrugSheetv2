-- Novel Charts — initial multi-tenant schema with Row-Level Security.
-- Every domain row carries clinic_id; RLS guarantees a user only ever touches
-- rows for clinics they belong to.

create extension if not exists pgcrypto;

-- ---------- Tenancy ----------
create table clinics (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  vetspire_token  text,                       -- encrypted at the app layer; never exposed to clients
  settings        jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

create table profiles (
  id                 uuid primary key references auth.users(id) on delete cascade,
  full_name          text,
  default_clinic_id  uuid references clinics(id),
  created_at         timestamptz not null default now()
);

create type clinic_role as enum ('owner','vet','tech','assistant');

create table clinic_members (
  clinic_id  uuid not null references clinics(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       clinic_role not null default 'assistant',
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

-- ---------- Formulary (Phase 2: editable per clinic) ----------
create table formulary_sections (
  id        uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references clinics(id) on delete cascade,
  name      text not null,
  color     text,
  sort      int  not null default 0
);

create table formulary_drugs (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references clinics(id) on delete cascade,
  section       text not null,
  name          text not null,
  conc          numeric,
  conc_u        text,
  route         text,
  dose_low      numeric,
  dose_high     numeric,
  dose_u        text,
  dsg_u         text,
  vol_factor    numeric,
  is_controlled boolean not null default false,
  mirror_of     text,
  rx_kind       text,
  sort          int not null default 0
);

-- ---------- Patients & charts ----------
create table patients (
  id                  uuid primary key default gen_random_uuid(),
  clinic_id           uuid not null references clinics(id) on delete cascade,
  created_by          uuid references auth.users(id),
  vetspire_patient_id text,
  name                text,
  species             text,
  breed               text,
  weight_kg           numeric,
  signalment          jsonb not null default '{}',
  status              text not null default 'active',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table charts (
  id         uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  clinic_id  uuid not null references clinics(id) on delete cascade,
  fields     jsonb not null default '{}',   -- mirrors the tool's serializeCase().fields
  selections jsonb not null default '[]',   -- selected-drugs plan
  grids      jsonb not null default '{}',   -- vitals grids
  checklist  jsonb not null default '[]',   -- discharge checklist
  features   text[] not null default '{}',  -- enabled sections
  updated_at timestamptz not null default now()
);

create table surgical_log (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  data       jsonb not null default '{}',
  logged_by  uuid references auth.users(id),
  logged_at  timestamptz not null default now()
);

create table audit_events (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references clinics(id) on delete cascade,
  user_id    uuid references auth.users(id),
  entity     text not null,
  entity_id  text,
  action     text not null,
  at         timestamptz not null default now()
);

-- ---------- Helper: is the current user a member of this clinic? ----------
create or replace function is_clinic_member(c uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from clinic_members m
    where m.clinic_id = c and m.user_id = auth.uid()
  );
$$;

create or replace function has_clinic_role(c uuid, roles clinic_role[])
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from clinic_members m
    where m.clinic_id = c and m.user_id = auth.uid() and m.role = any(roles)
  );
$$;

-- ---------- Enable RLS ----------
alter table clinics            enable row level security;
alter table profiles           enable row level security;
alter table clinic_members     enable row level security;
alter table formulary_sections enable row level security;
alter table formulary_drugs    enable row level security;
alter table patients           enable row level security;
alter table charts             enable row level security;
alter table surgical_log       enable row level security;
alter table audit_events       enable row level security;

-- Profiles: a user manages their own row.
create policy profiles_self on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- Clinics: members can read; only owners can update. (vetspire_token is read by the
-- server via the service role, which bypasses RLS — clients never select it.)
create policy clinics_read on clinics
  for select using (is_clinic_member(id));
create policy clinics_update on clinics
  for update using (has_clinic_role(id, array['owner']::clinic_role[]));

-- Membership rows: a user can see memberships for clinics they belong to.
create policy members_read on clinic_members
  for select using (is_clinic_member(clinic_id));
create policy members_manage on clinic_members
  for all using (has_clinic_role(clinic_id, array['owner']::clinic_role[]))
  with check (has_clinic_role(clinic_id, array['owner']::clinic_role[]));

-- Generic tenant tables: members read/write; formulary edits restricted to owner/vet.
create policy patients_rw on patients
  for all using (is_clinic_member(clinic_id)) with check (is_clinic_member(clinic_id));
create policy charts_rw on charts
  for all using (is_clinic_member(clinic_id)) with check (is_clinic_member(clinic_id));
create policy log_rw on surgical_log
  for all using (is_clinic_member(clinic_id)) with check (is_clinic_member(clinic_id));
create policy audit_read on audit_events
  for select using (is_clinic_member(clinic_id));
create policy audit_insert on audit_events
  for insert with check (is_clinic_member(clinic_id));

create policy sections_read on formulary_sections
  for select using (is_clinic_member(clinic_id));
create policy sections_write on formulary_sections
  for all using (has_clinic_role(clinic_id, array['owner','vet']::clinic_role[]))
  with check (has_clinic_role(clinic_id, array['owner','vet']::clinic_role[]));
create policy drugs_read on formulary_drugs
  for select using (is_clinic_member(clinic_id));
create policy drugs_write on formulary_drugs
  for all using (has_clinic_role(clinic_id, array['owner','vet']::clinic_role[]))
  with check (has_clinic_role(clinic_id, array['owner','vet']::clinic_role[]));

-- updated_at touch
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
create trigger patients_touch before update on patients
  for each row execute function touch_updated_at();
create trigger charts_touch before update on charts
  for each row execute function touch_updated_at();
