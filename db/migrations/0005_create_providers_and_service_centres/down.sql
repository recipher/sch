alter table payrolls drop column service_centre_id;
alter table payrolls drop column provider_id;
alter table legal_entities drop column default_service_centre_id;
alter table legal_entities drop column default_provider_id;
drop index party_locations_one_per_place;
drop table party_locations;
drop table service_centres;
drop table providers;
