-- Muse code pool schema (Supabase / Postgres)
create table if not exists codes (
  id              bigint generated always as identity primary key,
  code            text not null unique,
  uses_left       int not null default 25,
  confirmed_count int not null default 0,
  exhausted       boolean not null default false,
  created_at      timestamptz not null default now(),
  last_handed_at  timestamptz
);

create index if not exists codes_rotation_idx
  on codes (exhausted, uses_left desc, last_handed_at);

create table if not exists handouts (
  id            bigint generated always as identity primary key,
  code_id       bigint not null references codes(id),
  visitor_hash  text not null,
  handed_at     timestamptz not null default now(),
  outcome       text
);

create index if not exists handouts_recent_idx on handouts (handed_at desc);
create index if not exists handouts_visitor_idx on handouts (visitor_hash, handed_at desc);

create table if not exists submissions (
  id           bigint generated always as identity primary key,
  code_id      bigint not null references codes(id),
  visitor_hash text not null,
  created_at   timestamptz not null default now()
);

-- Public read; all writes go through the service-role edge function / anon RPC.
alter table codes enable row level security;
alter table handouts enable row level security;
alter table submissions enable row level security;

create policy "codes readable by all" on codes for select using (true);
create policy "handouts readable by all" on handouts for select using (true);
create policy "submissions readable by all" on submissions for select using (true);
