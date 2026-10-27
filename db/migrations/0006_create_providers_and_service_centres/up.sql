create table providers (
  id text primary key not null,
  name text not null check (length(trim(name)) > 0),
  created_at integer not null
);

create table service_centres (
  id text primary key not null,
  name text not null check (length(trim(name)) > 0),
  created_at integer not null
);

-- Locations of clients, providers and service centres. A legal entity's single location stays on its own row.
create table party_locations (
  id text primary key not null,
  party_role text not null check (party_role in ('client', 'provider', 'service-centre')),
  party_id text not null,
  country text not null check (length(country) = 2),
  region text,
  created_at integer not null
);

create unique index party_locations_one_per_place on party_locations (party_id, country, ifnull(region, ''));

alter table legal_entities add column default_provider_id text references providers (id);
alter table legal_entities add column default_service_centre_id text references service_centres (id);

-- Null means the payroll inherits its legal entity's default.
alter table payrolls add column provider_id text references providers (id);
alter table payrolls add column service_centre_id text references service_centres (id);
