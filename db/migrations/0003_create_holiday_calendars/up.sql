-- Which country and year combinations have been imported from the holiday source.
create table holiday_calendar_imports (
  id text primary key not null,
  country text not null check (length(country) = 2),
  year integer not null,
  imported_at integer not null,
  unique (country, year)
);

-- Public holidays as last imported. A re-sync replaces every row from the same import year, even
-- those observed in a neighbouring year.
create table imported_public_holidays (
  id text primary key not null,
  country text not null check (length(country) = 2),
  import_year integer not null,
  region text,
  date text not null,
  name text not null
);

create index imported_public_holidays_by_country_date on imported_public_holidays (country, date);

-- Local additions and removals of public holidays, which always survive a re-sync. A null region
-- applies to the whole country.
create table holiday_calendar_edits (
  id text primary key not null,
  country text not null check (length(country) = 2),
  region text,
  date text not null,
  kind text not null check (kind in ('add', 'remove')),
  name text,
  created_at integer not null,
  check (kind = 'remove' or length(trim(name)) > 0)
);

create unique index holiday_calendar_edits_one_per_day on holiday_calendar_edits (country, ifnull(region, ''), date);
