# Regeneration discards manual date edits

Dates in a draft schedule can be edited by hand, but regenerating that schedule (on demand, or automatically after a change) overwrites the edits. Before that happens the user is warned and shown which dates were overridden. Manual edits are almost always a workaround for a missing public holiday, and the right fix is to add the holiday to the holiday calendar so that every affected schedule picks it up. Keeping the calendar as the single source of truth stops one-off edits from quietly drifting away from the rules and then being preserved indefinitely.

## Considered Options

- **Preserve edits across regeneration as pinned overrides.** Rejected: it hides the real cause (a gap in the calendar), and a pinned date can end up on a non-working day after later calendar changes.
