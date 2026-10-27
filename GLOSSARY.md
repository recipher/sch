# Payroll Scheduling

Generates dated schedules for the payrolls of country-specific legal entities, so that every processing milestone around pay day lands on a working day.

## Language

### Organisations and people

**Party**:
Any client, legal entity, provider or service centre; the organisations whose locations and holidays govern a payroll's dates.
_Avoid_: Organisation, entity, stakeholder

**Party Role**:
Which kind of party (client, legal entity, provider or service centre) a template milestone refers to, resolved to an actual party when the template is copied into a payroll.
_Avoid_: Party type, owner

**Client**:
The organisation that owns one or more legal entities; associated with one or more countries.
_Avoid_: Customer, parent company, group

**Legal Entity**:
A company registered in a specific country that employs workers and runs payrolls.
_Avoid_: Company, employer, entity

**Provider**:
The external payroll processor that carries out payroll processing; associated with one or more countries.
_Avoid_: Vendor, processor, bureau

**Service Centre**:
The internal processing organisation that coordinates payroll work; associated with one or more countries.
_Avoid_: Hub, ops team, back office

**Location**:
A country, optionally narrowed to one of its regions, where a party operates. A legal entity has exactly one; clients, providers and service centres may have several.
_Avoid_: Site, office, jurisdiction

**Worker**:
A person employed by a legal entity who needs to be paid.
_Avoid_: Employee, staff, payee

### Calendar

**Country**:
The jurisdiction whose working week and public holidays govern which days are working days.

**Region**:
A subdivision of a country (such as a state or province) that observes its own public holidays in addition to national ones.
_Avoid_: State, province, subdivision

**Working Week**:
The days of the week on which business is normally done in a country, usually Monday to Friday.
_Avoid_: Business week, workweek

**Public Holiday**:
A dated day on which business is not done in a country or one of its regions, even though it falls in the working week.
_Avoid_: Bank holiday, holiday, day off

**Holiday Calendar**:
The set of public holidays that apply to a country or region, initially imported and then kept and edited locally.
_Avoid_: Holiday list, calendar (on its own)

**Holiday Calendar Edit**:
A local addition or removal of a public holiday for a whole country or one region, which survives a re-sync of the holiday calendar.
_Avoid_: Local edit, manual holiday, adjustment

**Holiday Override**:
A party-specific change to the holiday calendar of one of its locations, adding or removing a non-working day for that party only.
_Avoid_: Custom holiday, exception

**Working Day**:
A day that falls in the country's working week and is not a public holiday for a given location, after applying any holiday overrides of the party concerned.
_Avoid_: Business day

### Payroll

**Payroll**:
The standing, recurring arrangement by which a legal entity pays a group of its workers at a given pay frequency. A legal entity may have many.
_Avoid_: Payroll cycle, pay group

**Pay Frequency**:
How often a payroll pays: weekly, fortnightly, four-weekly, semi-monthly or monthly. It is fixed once any schedule has been generated; a different frequency means a new payroll.
_Avoid_: Cadence, interval

**Pay Period**:
The calendar span a pay run belongs to, determined by the payroll's pay frequency, such as March 2027 or week 3 of 2027.
_Avoid_: Period (on its own), cycle

**Pay Run**:
One occurrence of a payroll, with its own pay day and dated milestones.
_Avoid_: Run, cycle, period, payroll (for a single occurrence)

**Schedule**:
The dated pay day and milestones of one pay run; the unit that is generated, approved and invalidated. A pay run has at most one live and one draft schedule at a time.
_Avoid_: Calendar, timetable, plan

**Draft Schedule**:
A schedule that has been generated (or regenerated) but not yet approved; it may be edited or overwritten.
_Avoid_: Pending schedule, proposed schedule

**Live Schedule**:
An approved schedule that people work to; it stays live until a replacement draft is approved.
_Avoid_: Approved schedule, published schedule, active schedule

**Superseded Schedule**:
A formerly live schedule that has been replaced by a newer approved one, kept as a record of what was communicated.
_Avoid_: Archived schedule, old version

**Generation Range**:
The start and end dates chosen when generating schedules; it covers every pay run whose pay period starts within it.
_Avoid_: Period, horizon, window

**Pay Day**:
The date by which workers must be paid in a pay run. It is itself a milestone: the anchor of the chain, from which all other milestones are dated, and always follows the legal entity's location.
_Avoid_: Payment date, pay date

**Pay Day Rule**:
A payroll's definition of how each pay run's pay day is chosen relative to its pay period: the last working day (less an offset), the last given weekday, a fixed date, or the first working day of the following pay period (plus an offset). It also says which way to move when the chosen day is not a working day.
_Avoid_: Pay date rule, pay day logic

**Milestone**:
A processing step before or after pay day whose date must be tracked, dated as a number of working days from the milestone before it in the chain. It must land on a working day in every country whose calendar it follows.
_Avoid_: Task, step, checkpoint

**Milestone Template**:
A reusable chain of milestones that is copied into a payroll; later changes to the template do not affect payrolls already created from it.
_Avoid_: Default milestones, blueprint
