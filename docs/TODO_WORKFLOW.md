# Product TODO workflow

GemGo keeps its private product backlog outside this public repository. No private document link, copied requirement, collaborator name or internal discussion belongs here.

## Public decision states

1. **Proposed** — described without private source material.
2. **Chosen** — approved for public implementation.
3. **Completed** — code and public documentation are updated and verified.
4. **Rejected** — intentionally not planned.

Only implemented behaviour and public-safe rationale are documented in this repository. The private backlog remains the source of truth for internal review history; the repository and its tests remain the source of truth for what is actually implemented.

## Implementation rule

Backlog review must not copy private source text into code, issues, commits or public documentation. Once a task is approved, the public repository records only the resulting feature, its user impact, its technical behaviour and public-safe evidence.

If the repository has already advanced beyond an older backlog description, preserve verified working behaviour and reconcile the task with the current head. Do not re-implement or revert working code merely because a backlog snapshot is stale.

## Codex continuation contract

An approved task handed to Codex must include task-specific **Acceptance criteria**, **Definition of Done**, **Next action**, **Execution mode** and, when relevant, a **Decision / external gate**. These fields define when Codex may continue autonomously and when it must stop.

Execution modes:

- **AUTO** — continue autonomously through implementation, tests, review and public-safe documentation until the Definition of Done is satisfied.
- **AUTO→GATE** — continue autonomously through every safe step before the named gate. Stop only at that gate; do not stop early merely because a later external dependency exists.
- **USER ACTION** — prepare everything that can be done safely, then provide the exact external action still required. Never fabricate credentials, secrets, provider-console results or manual verification.
- **USER DECISION** — gather evidence, compare realistic options and provide a recommendation, then stop before making the product, economic, legal or partnership decision on the user's behalf.
- **DEFERRED** — do not implement the task until its dependency or explicit reactivation condition is satisfied.
- **DONE** — historical closure. Do not reopen it without a regression or a new approved requirement.

Codex must not invent credentials, legal terms, retention periods, partnerships, paid commitments, reward economics or new product policy. When a gate is reached, report the smallest concrete decision/action required and preserve all completed work so execution can resume immediately afterward.

## Completion rule

Before marking a task complete:

1. verify the current repository state instead of assuming the backlog snapshot is current;
2. satisfy every Acceptance criterion;
3. satisfy the task-specific Definition of Done;
4. run the relevant Biome, type, test, build, security and browser/preflight checks for the changed surface;
5. review the diff for regressions, privacy/security issues, unsupported claims and dead code;
6. update public-safe documentation/evidence when behaviour changed;
7. leave no known blocking issue hidden behind a green task status.

A task that reaches a user gate is not `Done`: keep it resumable and record the precise remaining action or decision.
