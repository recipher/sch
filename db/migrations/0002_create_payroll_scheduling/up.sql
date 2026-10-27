create table clients (
  id text primary key not null,
  name text not null check (length(trim(name)) > 0),
  created_at integer not null
);

create table legal_entities (
  id text primary key not null,
  client_id text not null references clients (id),
  name text not null check (length(trim(name)) > 0),
  country text not null check (length(country) = 2),
  region text,
  created_at integer not null
);

create table payrolls (
  id text primary key not null,
  legal_entity_id text not null references legal_entities (id),
  name text not null check (length(trim(name)) > 0),
  pay_frequency text not null check (pay_frequency in ('monthly')),
  pay_day_rule text not null check (pay_day_rule in ('last-working-day')),
  created_at integer not null
);

create table pay_runs (
  id text primary key not null,
  payroll_id text not null references payrolls (id),
  pay_period_start text not null,
  pay_period_end text not null,
  unique (payroll_id, pay_period_start)
);

create table schedules (
  id text primary key not null,
  pay_run_id text not null references pay_runs (id),
  status text not null check (status in ('draft')),
  pay_day text not null,
  created_at integer not null
);

create unique index schedules_one_draft_per_pay_run on schedules (pay_run_id) where status = 'draft';
