-- Countries without a row work Monday to Friday.
create table working_weeks (
  country text primary key not null check (length(country) = 2),
  days text not null check (length(days) > 0),
  updated_at integer not null
);
