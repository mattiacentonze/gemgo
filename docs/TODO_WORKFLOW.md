# Product TODO workflow

The tourism team maintains product suggestions in the shared Google Doc:

<https://docs.google.com/document/d/1AT6jVmsd7aX4V35q6NutOMTxYXD5F_pDo_8K4QE-v0w/edit?tab=t.0>

## Decision states

1. **Open** — active text without strike-through.
2. **Proposed** — reviewed in chat with value, implementation and risks.
3. **Chosen** — explicitly approved by Mattia.
4. **Completed** — code and documentation are updated and verified.
5. **Rejected** — intentionally not planned, with a short reason recorded in
   the decision discussion.

Completed and rejected items are struck through in the Google Doc, never
deleted. This preserves context for tourism collaborators and makes it possible
to revisit an earlier choice.

## Implementation rule

The daily review is read-only. It may recommend, clarify or identify duplicates,
but it must not edit the Doc or the repository until a TODO is explicitly
chosen. After implementation or rejection, update the Doc in the same workflow
that records the final decision.

## Implemented in the current MVP

The approved implementation covers TODOs 1, 2, 3, 5, 6, 7, 8, 9 and 11:

- Explore destinations can be added to My Plan and the change can be undone.
- Plans can be saved locally.
- Recommendations expose their main reasons.
- Explore cards show crowd category, date, source and confidence.
- `Busy` predictions are excluded from automatic plans.
- “How it works” is visible beside the planner and expanded below.
- “Nearby” is used only when location is known; otherwise the UI says
  “Places in this area”.
- GemXP has a detailed local ledger.
- red status treatment is reserved for errors and busy crowd conditions;
  success is green and neutral information uses neutral surfaces.

TODO 10 was refined instead of implemented literally: no email is requested to
plan or earn GemXP. A future account is required only to convert eligible XP
into GemCredits and redeem real rewards.
