# Local, layered holiday calendars instead of querying Holiday API live

Schedules must land on working days, and public holidays are sourced from Holiday API (holidayapi.com). We import each country's holidays per year into a local holiday calendar when first needed, and generation only ever reads the local copy. On top of the imported data, dates can be added or removed at country level, region level, and per party and location (holiday overrides), with the most specific layer winning. Local edits always survive a manual re-sync, and a re-sync never removes a locally added date.

We chose this because the API alone cannot express short-notice holidays, regional or party-specific working arrangements, or a party working through a public holiday. It also keeps generation deterministic and reproducible, and lets it work without the API being available.

## Consequences

- If Holiday API has no data for a country or year a generation needs, generation is blocked and the gap is named. It never treats that country as having no holidays.
- Any edit to a holiday calendar or override can change dates and so can trigger redrafting of live schedules (see ADR-0003).
