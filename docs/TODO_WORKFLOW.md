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
