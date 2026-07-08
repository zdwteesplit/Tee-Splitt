-- Tee Split schema — foundation pass (trips + players only).
-- Expenses, rounds, and sidebets are added in a later pass per the build spec.

create extension if not exists pgcrypto;

create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create index if not exists players_trip_id_idx on players(trip_id);
