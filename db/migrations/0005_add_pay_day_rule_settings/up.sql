-- data-table/transaction: none
-- SQLite can't change a check constraint in place, so payrolls is rebuilt the way SQLite documents:
-- with foreign keys off, which only takes effect outside a transaction, so pay_runs keeps pointing
-- at the rebuilt table.
pragma foreign_keys = off;
begin;

-- Each pay day rule kind has its own settings: an offset in working days for the last-working-day
-- and next-period rules, and a weekday (0 Sunday to 6 Saturday) or day of the month, with a roll
-- direction, for the others.
create table payrolls_rebuilt (
  id text primary key not null,
  legal_entity_id text not null references legal_entities (id),
  name text not null check (length(trim(name)) > 0),
  pay_frequency text not null check (pay_frequency in ('monthly')),
  pay_day_rule text not null check (
    pay_day_rule in ('last-working-day', 'last-weekday', 'fixed-date', 'next-period-first-working-day')
  ),
  pay_day_offset integer check (pay_day_offset >= 0),
  pay_day_weekday integer check (pay_day_weekday between 0 and 6),
  pay_day_of_month integer check (pay_day_of_month between 1 and 31),
  pay_day_roll text check (pay_day_roll in ('earlier', 'later')),
  created_at integer not null,
  check (
    case pay_day_rule
      when 'last-weekday' then pay_day_weekday is not null and pay_day_roll is not null
        and pay_day_offset is null and pay_day_of_month is null
      when 'fixed-date' then pay_day_of_month is not null and pay_day_roll is not null
        and pay_day_offset is null and pay_day_weekday is null
      else pay_day_offset is not null
        and pay_day_weekday is null and pay_day_of_month is null and pay_day_roll is null
    end
  )
);

insert into payrolls_rebuilt (id, legal_entity_id, name, pay_frequency, pay_day_rule, pay_day_offset, created_at)
select id, legal_entity_id, name, pay_frequency, pay_day_rule, 0, created_at from payrolls;

drop table payrolls;
alter table payrolls_rebuilt rename to payrolls;

commit;
pragma foreign_keys = on;
