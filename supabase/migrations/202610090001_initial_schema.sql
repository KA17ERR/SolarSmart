-- Optional authenticated project storage. The local demo does not use this schema.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Solar owner' check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.solar_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  location_label text not null check (char_length(location_label) <= 120),
  assessment_status text not null default 'estimated' check (assessment_status in ('draft', 'estimated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists solar_projects_owner_updated_idx on public.solar_projects(owner_id, updated_at desc);

create table if not exists public.roof_configurations (
  project_id uuid primary key references public.solar_projects(id) on delete cascade,
  width_m numeric not null check (width_m between 2 and 100),
  length_m numeric not null check (length_m between 2 and 100),
  area_m2 numeric not null check (area_m2 > 0 and area_m2 <= 10000),
  panel_orientation text not null check (panel_orientation in ('landscape', 'portrait')),
  roof_facing text not null check (roof_facing in ('south', 'south-east', 'south-west', 'east', 'west', 'north')),
  tilt_degrees numeric not null check (tilt_degrees between 0 and 60),
  shading text not null check (shading in ('low', 'moderate', 'high')),
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.solar_system_configurations (
  project_id uuid primary key references public.solar_projects(id) on delete cascade,
  panel_watts integer not null check (panel_watts between 100 and 1000),
  panel_count integer not null check (panel_count between 0 and 500),
  panel_positions jsonb not null default '[]'::jsonb,
  installed_capacity_kw numeric not null check (installed_capacity_kw between 0 and 500),
  battery_capacity_kwh numeric check (battery_capacity_kwh is null or battery_capacity_kwh between 0 and 200),
  assumptions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.energy_assessments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.solar_projects(id) on delete cascade,
  monthly_consumption_kwh numeric not null check (monthly_consumption_kwh between 1 and 30000),
  tariff_usd_per_kwh numeric not null check (tariff_usd_per_kwh between 0.001 and 1000),
  estimated_generation_kwh numeric,
  estimated_savings_usd numeric,
  estimated_payback_years numeric,
  calculation_version text not null,
  inputs jsonb not null,
  outputs jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists energy_assessments_project_created_idx on public.energy_assessments(project_id, created_at desc);

create table if not exists public.solar_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.solar_projects(id) on delete cascade,
  report_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists solar_reports_project_created_idx on public.solar_reports(project_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create or replace function public.handle_new_solar_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Solar owner'))
  on conflict (id) do update set display_name = excluded.display_name, updated_at = now();
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_solar on auth.users;
create trigger on_auth_user_created_solar after insert on auth.users for each row execute procedure public.handle_new_solar_user();
drop trigger if exists solar_profiles_updated_at on public.profiles;
create trigger solar_profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists solar_projects_updated_at on public.solar_projects;
create trigger solar_projects_updated_at before update on public.solar_projects for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.solar_projects enable row level security;
alter table public.roof_configurations enable row level security;
alter table public.solar_system_configurations enable row level security;
alter table public.energy_assessments enable row level security;
alter table public.solar_reports enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles, public.solar_projects,
  public.roof_configurations, public.solar_system_configurations,
  public.energy_assessments, public.solar_reports to authenticated;

create policy "profiles are private to their owner" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "projects are private to their owner" on public.solar_projects for all to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create policy "roof configurations follow project owner" on public.roof_configurations for all to authenticated
  using (exists (select 1 from public.solar_projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.solar_projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "system configurations follow project owner" on public.solar_system_configurations for all to authenticated
  using (exists (select 1 from public.solar_projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.solar_projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "energy assessments follow project owner" on public.energy_assessments for all to authenticated
  using (exists (select 1 from public.solar_projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.solar_projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "reports follow project owner" on public.solar_reports for all to authenticated
  using (exists (select 1 from public.solar_projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.solar_projects p where p.id = project_id and p.owner_id = (select auth.uid())));
