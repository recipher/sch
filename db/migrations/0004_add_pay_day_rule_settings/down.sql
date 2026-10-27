-- data-table/transaction: none
-- Payrolls using the newer pay day rules can't be represented before this migration and are
-- refused by the restored check constraint. Rebuilt as in up.sql.
pragma foreign_keys = off;
begin;

create table payrolls_rebuilt (
  id text primary key not null,
  legal_entity_id text not null references legal_entities (id),
  name text not null check (length(trim(name)) > 0),
  pay_frequency text not null check (pay_frequency in ('monthly')),
  pay_day_rule text not null check (pay_day_rule in ('last-working-day')),
  created_at integer not null
);

insert into payrolls_rebuilt (id, legal_entity_id, name, pay_frequency, pay_day_rule, created_at)
select id, legal_entity_id, name, pay_frequency, pay_day_rule, created_at from payrolls;

drop table payrolls;
alter table payrolls_rebuilt rename to payrolls;

commit;
pragma foreign_keys = on;
