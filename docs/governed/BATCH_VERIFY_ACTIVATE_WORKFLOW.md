# Batch → Verify → Activate Workflow

**Short name:** BVA  
**Scope:** technology- and provider-agnostic operating workflow  
**Applies to:** material implementation, release, migration, recovery, infrastructure, policy-controlled activation, and other work that benefits from exact-candidate evidence  
**Owner-reserved decisions:** remain governed by the applicable TOS contract or project authority; BVA does not grant approval or promotion authority

## Purpose

BVA defines the default execution pattern for material work across TOS-governed projects. It exists to get the efficiency benefit of batching and parallel work without collapsing implementation, verification, and live activation into one uncontrolled step.

The governing sequence is:

```text
Define
→ Batch Build
→ Local / Static Gate
→ Freeze Exact Candidate
→ Parallel Verification
→ Reconcile Evidence
→ Bounded Activation
→ Independent Readback
→ Negative Post-Activation Proof
→ Replay / Idempotency Proof where safe
→ Evidence Closeout
→ Promote, Continue, or Hold
```

Projects MAY specialize gate names, commands, evidence systems, environments, and adapters. They MUST preserve the control boundaries unless an explicit higher-authority rule says otherwise.

## Core invariants

1. **Batch related work.** Implementation, tests, negative tests, configuration, and command wiring for one capability SHOULD be developed as one coherent batch.
2. **Freeze one exact candidate.** Once verification begins, the candidate identity MUST be fixed. Any candidate-changing edit starts a new verification cycle.
3. **Parallelize independent evidence.** Independent verification lanes SHOULD run concurrently when safe.
4. **Use exact-candidate evidence.** Evidence from a prior candidate is historical evidence, not proof for the current candidate.
5. **Missing evidence is not success.** A required gate with stale, absent, queued, or ambiguous evidence is `not yet evidenced` or `indeterminate`, never implicitly green.
6. **Separate implementation, verification, and activation.** Passing tests does not authorize a live mutation.
7. **Activate narrowly.** A live step SHOULD be the smallest bounded mutation that advances the state machine.
8. **Read back independently.** A successful command response is not sufficient proof of resulting state.
9. **Prove negative boundaries after activation.** Capabilities that are supposed to remain impossible MUST still be proven impossible.
10. **Treat ambiguity as indeterminate.** An uncertain write or uncertain readback MUST NOT be mapped to success.
11. **No silent scope expansion.** Adjacent findings become separately tracked work unless they are required to satisfy the current acceptance criteria.
12. **Preserve owner-reserved actions.** BVA never grants approval, promotion, production mutation, contract activation, or other reserved authority.
13. **Prefer bounded batches over repeated one-off actions.** Discovery, implementation, verification, activation, and closeout SHOULD each be grouped to reduce repeated tool use and context churn.
14. **Do not use shell-wide errexit as workflow control.** Failures SHOULD remain visible and explicitly handled per command or step so the operator retains control.

## Phase 0 — Define the batch

Before implementation, state the batch contract:

```text
Objective:
Active issue / work order:
Allowed changes:
Forbidden changes:
Required tests:
Required evidence:
Live mutation allowed:
Production mutation allowed:
Definition of done:
```

If material scope, authority, or acceptance criteria are unknown, authorization is not ready.

## Phase 1 — Batch Build

Group related work whenever practical:

```text
implementation
+ positive tests
+ negative / adversarial tests
+ CLI/API/configuration wiring
+ documentation required to operate or verify the capability
```

Independent lanes MAY proceed in parallel when they do not create conflicting writes or authority races.

Avoid bookkeeping-only candidate churn. The desired output is one coherent candidate, not a sequence of partially meaningful states.

## Phase 2 — Local / Static Gate

Before freezing the candidate, run the cheap and deterministic checks available to the project, for example:

- syntax/type/schema validation;
- focused unit tests;
- negative tests;
- configuration validation;
- authority-boundary checks;
- generated-artifact checks;
- prohibited-target scans;
- repository cleanliness checks.

Failures MAY be repaired inside the active build batch while the candidate is still mutable.

## Phase 3 — Freeze Exact Candidate

Record at minimum:

```text
candidate_id=<exact immutable candidate identity>
base_id=<exact base identity where applicable>
work_ref=<issue/work-order identifier>
branch_or_isolation=<working isolation identifier where applicable>
```

For Git work, the candidate identity is normally the full commit SHA.

After freeze, candidate-changing edits invalidate the current evidence package. Metadata-only tracking updates that do not alter the candidate MAY continue.

## Phase 4 — Parallel Verification

Run all independent required gates concurrently where safe. Typical lanes include:

- full CI / verification;
- integration or schedule integrity;
- governance / policy / security audit;
- build or package proof;
- preview/staging deployment;
- environment parity;
- independent review;
- restore/recovery proof.

Each evidence item MUST identify the exact candidate it proves.

Example evidence matrix:

| Gate | Candidate | Status | Evidence |
|---|---|---|---|
| Verify | exact candidate | PASS/FAIL | run ID |
| Integration | exact candidate | PASS/FAIL | run ID |
| Governance | exact candidate | PASS/FAIL | audit/run ID |
| Build | exact candidate | PASS/FAIL | build ID |
| Preview deployment | exact candidate | PASS/FAIL/NOT YET EVIDENCED | deployment ID |

A green result attached to an older candidate MUST NOT be promoted to the current row.

## Phase 5 — Reconcile Evidence

Classify findings before changing scope:

```text
VALID DEFECT
ALREADY COVERED
STALE ASSUMPTION
USEFUL HARDENING
SCOPE EXPANSION
INFRASTRUCTURE / EVIDENCE DELAY
```

Only findings required by the current acceptance criteria should force the active candidate to change.

If the candidate changes:

```text
new candidate
→ freeze again
→ rerun required exact-candidate gates
```

Do not carry green evidence forward from a superseded candidate unless the governing gate explicitly proves it is candidate-independent.

## Phase 6 — Activation Gate

Live mutation is permitted only when the applicable evidence and authority requirements are satisfied.

Before mutation, capture the relevant pre-state, such as:

- exact candidate identity;
- target environment/system;
- authority state;
- row/object counts;
- hashes/digests;
- deployment identity;
- neighboring-environment state;
- expected bounded mutation.

If production or another high-impact target is not explicitly authorized, it remains prohibited.

## Phase 7 — Smallest Bounded Live Operation

Perform one intended transition whenever possible.

Prefer:

```text
initialize one projection
apply one migration to one permitted environment
seed an intentionally unowned authority record
perform one compare-and-set
move one versioned pointer
```

Avoid combining initialization, authority grant, migration, synchronization, publication, or promotion into one opaque command when those transitions can be proven separately.

## Phase 8 — Independent Readback

Verify resulting state through an independent read path. Prove the fields that matter and the boundaries that must not have moved.

Examples:

- expected record exists with exact values;
- event and projection agree;
- expected hash/digest matches;
- forbidden records/tables/objects did not change;
- neighboring environment did not change;
- authority did not widen;
- unrelated publication/side-effect state did not mutate.

If the command says success but independent readback is missing, contradictory, or incomplete, the result is `indeterminate` or `failed` according to the applicable contract.

## Phase 9 — Negative Post-Activation Proof

Prove that prohibited capabilities remain prohibited after the live step.

Examples:

- unowned authority still cannot publish or synchronize;
- preview activation cannot target production;
- a read-only credential still cannot mutate;
- a migration does not silently grant runtime authority;
- a recovery operation cannot become a publication operation.

Negative proof is part of successful activation when the safety property matters.

## Phase 10 — Replay / Idempotency Proof

Where replay is safe, prove the operation is idempotent or explicitly refuses duplicate execution.

Expected pattern:

```text
first run  → intended bounded mutation
second run → no-op or explicit refusal
```

Unexpected second mutation is a defect unless duplicate mutation is explicitly part of the contract.

## Phase 11 — Evidence Closeout

Update the durable work record with the minimum decision-ready evidence:

```text
exact candidate
exact base where relevant
implemented capability
negative tests
verification run IDs
build/deployment IDs
pre-state
mutation performed
post-state / independent readback
negative post-activation proof
replay/idempotency result where applicable
production/high-impact target impact
intentionally disabled capabilities
next explicit gate
```

Use precise state language such as:

- implemented;
- tested;
- exact-candidate verified;
- preview/staging initialized;
- not yet activated;
- intentionally disabled;
- production untouched;
- indeterminate;
- ready for owner decision.

Do not collapse these states into a generic `done` claim.

## Phase 12 — Promote, Continue, or Hold

There are three normal outcomes:

### Promote

All required evidence and activation proofs pass and the applicable authority permits promotion.

### Continue

The current bounded phase is complete but later phases intentionally remain.

### Hold

Required evidence is missing, stale, conflicting, failing, or indeterminate. Freeze the candidate and do not widen mutation authority while the hold remains.

## State model

```text
DEFINED
  ↓
BUILDING
  ↓
CANDIDATE_FROZEN
  ↓
VERIFYING
  ├── defect → REPAIRING → CANDIDATE_FROZEN
  ↓
VERIFIED
  ↓
ACTIVATION_READY
  ↓
ACTIVATING
  ↓
READBACK
  ├── ambiguous → INDETERMINATE
  ├── mismatch  → FAILED
  ↓
PROVEN
  ↓
PROMOTABLE / CONTINUE
```

`INDETERMINATE` is a first-class state and MUST NOT be automatically converted to success.

## Parallelization rule

Parallelize **inside** a control phase, not across an authority boundary.

Good:

```text
                 ┌→ implementation
DEFINE → BATCH ──┼→ negative tests
                 ├→ configuration
                 └→ static checks
                         ↓
                   EXACT CANDIDATE
                         ↓
                 ┌→ verify
                 ├→ integration
                 ├→ governance
                 ├→ build
                 └→ preview deploy
                         ↓
                  EVIDENCE RECONCILE
                         ↓
                 BOUNDED LIVE ACTION
                         ↓
                 INDEPENDENT READBACK
```

Do not interleave candidate mutation, production activation, and still-running verification unless an explicit governing workflow permits that concurrency.

## Standard status summary

At any point, material work SHOULD be explainable as:

```text
ACTIVE WORK:
<issue / objective>

EXACT CANDIDATE:
<immutable identity>

COMPLETED:
<phases>

GREEN EVIDENCE:
<gates and IDs>

LIVE STATE:
<what is actually active>

INTENTIONALLY DISABLED:
<what remains impossible>

CURRENT HOLD:
<missing/failing evidence, if any>

NEXT EXPLICIT GATE:
<one bounded next action>
```

## Relationship to TOS bounded execution

BVA is a reusable execution discipline, not the autonomous executor itself. Future `tos execute next` behavior may compile and enforce BVA-compatible phases, budgets, independent verification, and promotion gates, but this document does not grant autonomous authority.

## Governing principle

> **Batch aggressively. Verify in parallel. Activate narrowly. Prove independently.**

Efficiency comes from parallelizing safe work and reducing repeated context/tool churn—not from collapsing evidence or authority boundaries.