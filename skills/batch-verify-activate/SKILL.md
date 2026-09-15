# Batch → Verify → Activate

Use this skill as the default operating pattern for material implementation, release, migration, recovery, infrastructure, and activation work unless an explicit higher-authority contract or owner decision requires a different workflow.

Canonical workflow: `docs/governed/BATCH_VERIFY_ACTIVATE_WORKFLOW.md`.

## Trigger

Apply this skill when work has one or more of these characteristics:

- multiple related implementation/test/configuration steps;
- more than one independent verification lane;
- an exact candidate that must be proven before promotion;
- a preview/staging/production mutation;
- a migration, recovery, restore, cutover, credential/authority transition, or external side effect;
- a meaningful risk of stale evidence, hidden scope expansion, or ambiguous success.

For trivial read-only or single-step work, use judgment and do not manufacture ceremony that adds no control value.

## Required behavior

1. Define the bounded batch: objective, issue/work order, allowed changes, forbidden changes, required tests/evidence, mutation authority, and definition of done.
2. Group related implementation, positive tests, negative tests, configuration, and command wiring into a coherent build batch.
3. Run cheap deterministic/static checks before candidate freeze.
4. Freeze one exact immutable candidate before collecting acceptance evidence.
5. Run independent required verification lanes in parallel where safe.
6. Bind every evidence claim to the exact candidate. Treat evidence for an older candidate as historical only.
7. If required evidence is stale, missing, queued, ambiguous, or attached to the wrong candidate, report `not yet evidenced` or `indeterminate`; do not infer success.
8. Reconcile findings before expanding scope. Adjacent hardening belongs in separate tracked work unless it is required by current acceptance criteria.
9. Do not perform a live mutation until the applicable exact-candidate gates and authority conditions are satisfied.
10. Make the live step the smallest bounded transition that advances the state machine.
11. Independently read authoritative state after mutation; do not trust command success alone.
12. Prove important negative boundaries still hold after activation.
13. Prove replay/idempotency or explicit duplicate refusal where safe and relevant.
14. Close out with exact candidate, evidence IDs, live state, intentionally disabled capabilities, impact on high-risk environments, and the next explicit gate.
15. Preserve owner-reserved approval, promotion, production mutation, contract activation, and other protected actions.

## Parallelization rule

Parallelize work **within** a control phase when lanes are independent. Do not parallelize across an authority boundary merely for speed.

Preferred shape:

```text
Define
→ Batch implementation/test/config lanes
→ Freeze exact candidate
→ Parallel verify/audit/build/deploy evidence lanes
→ Reconcile evidence
→ Smallest bounded live mutation
→ Independent readback + negative proof
→ Closeout / next gate
```

## Candidate mutation rule

Any candidate-changing edit after freeze invalidates the current candidate evidence package and starts a new verification cycle. Metadata-only tracking updates that do not change the candidate do not require a new code candidate.

## Failure handling

- Preserve the failing evidence.
- Classify the failure before repairing it.
- Repair only within authorized scope.
- Rerun the affected exact-candidate gates.
- Treat ambiguous writes as `indeterminate` until independent evidence resolves them.
- Do not use shell-wide `set -e`, `set -E`, `set -Eeuo pipefail`, or equivalent errexit behavior as the workflow control mechanism unless explicitly required by the operator. Prefer explicit per-command failure handling so the session remains inspectable and controllable.

## Standard status format

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

## Prohibitions

- Do not silently widen scope.
- Do not reuse stale exact-candidate evidence.
- Do not call partial evidence complete.
- Do not convert an ambiguous mutation into success.
- Do not combine unrelated authority-changing transitions merely to save steps.
- Do not let a Worker self-verify when an independent Verifier is required.
- Do not bypass an owner-reserved promotion or activation decision.

## Governing principle

**Batch aggressively. Verify in parallel. Activate narrowly. Prove independently.**