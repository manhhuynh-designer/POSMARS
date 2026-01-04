-- 20240101_init.sql
create table if not exists projects (
  id uuid default gen_random_uuid() primary key,
  client_slug text unique not null,
  config jsonb default '{}'::jsonb,
  asset_url text,
  is_active boolean default true,
  ga_id text,
  script_custom text,
  created_at timestamptz default now()
);

create table if not exists leads (
  id bigint generated always as identity primary key,
  project_id uuid references projects(id),
  user_data jsonb default '{}'::jsonb,
  pos_id text,
  location_name text,
  consent boolean default false,
  created_at timestamptz default now()
);

alter table projects enable row level security;
alter table leads enable row level security;

-- Policies
create policy "Public projects are viewable by everyone" on projects for select using (true);
create policy "Public can insert leads" on leads for insert with check (true);
