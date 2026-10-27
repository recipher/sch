# Schedules are versioned per pay run, and redrafting recomputes and compares

The unit that is generated, approved and invalidated is the schedule of a single pay run, not a payroll's whole year. A pay run has at most one live schedule and one draft schedule at a time. When a draft is approved it becomes live, and the previous live schedule is kept as a superseded schedule, because the business must be able to answer "what dates did we tell them?"

Any change (holidays, working week, pay day rule, milestone chain, party reassignment, locations) leads to recomputing the dates of affected live schedules and comparing them with the current ones, rather than inferring impact from the kind of change. A new draft is created only when the dates actually differ. Only live schedules whose first milestone is still in the future are redrafted. Those already underway are flagged as affected by the change but left live. The live schedule stays live until its replacement draft is approved.

## Consequences

- Generating over a range overwrites existing drafts (edited or not) but never touches live schedules.
- A payroll's pay frequency cannot change once any schedule exists, because existing pay periods would no longer line up. A different frequency needs a new payroll.
