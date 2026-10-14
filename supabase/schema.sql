-- Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  person_id uuid unique references public.people(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Seed all known unit codes. Re-running this script is safe.
insert into public.units (code)
select building || '-' || n
from (values ('A1',40),('A2',40),('A3',40),('C1',40),('C2',40),('C3',40),('B1',22)) as b(building, unit_count)
cross join lateral generate_series(1, b.unit_count) as n
on conflict (code) do nothing;

-- IMPORTANT SECURITY NOTE:
-- This project currently has no manager authentication, as requested.
-- Do not enable public write access in production without accepting that anyone
-- who can reach the app may change data. Prefer manager authentication and RLS.
-- This starter deliberately does not add permissive RLS policies.
