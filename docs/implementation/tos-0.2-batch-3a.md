# TOS 0.2 — Batch 3A: Truth Steward and Canonical Facts

**Status:** implementation in progress  
**Branch:** `agent/tos-0-2-batch-3a-truth-steward`  
**Base:** Batch 2C merge `f6da923529d9ccf3c2eb56140c05518fd52f83ed`  
**Owner:** Patrick Craven

## Goal

Turn `.tos/facts.yaml` into an executable canonical fact catalog with explicit provenance, authority, confidence, freshness, invalidation behavior, and status-to-state consistency.

## Scope

- Runtime version `0.2.0`.
- Truth validation implemented in `packages/kernel/src/truth.ts`.
- Canonical JSON Schema in `schemas/fact-record.schema.json`.
- `tos fact list`, `tos fact show`, and `tos fact validate`.
- Truth Steward agent specification and human-assisted skill.
- Negative controls for duplicate IDs, contradictory status/state pairs, expired facts, missing provenance, and missing invalidation rules.
- Node.js 20 and 22 CI smoke validation.

## Explicitly out of scope

- Automatic conflict resolution.
- Source crawling or external-provider adapters.
- Requirements-to-fact traceability, which belongs to Batch 3C.
- Persistent indexes or caches.
- Autonomous agent execution, scheduling, or memory.
- Business-policy approval.

## Fact contract

Each canonical fact requires:

1. Stable `TOS-FACT-###` identity.
2. A precise statement.
3. Separate observed and target states.
4. A status that agrees with the observed state.
5. Confidence level.
6. One or more provenance references.
7. Named authority.
8. Last-verification date.
9. Positive freshness window and expiry date.
10. One or more invalidation conditions.

## Acceptance criteria

1. The repository fact catalog loads in stable fact-ID order.
2. Every fact ID matches `TOS-FACT-###` and is unique.
3. Every fact has a statement, observed state, target state, status, confidence, authority, evidence, freshness policy, and invalidation rule.
4. Verified, declared, inferred, unknown, conflicting, and not-applicable statuses agree with their observed state.
5. Evidence references require type and reference; supplied capture dates and commit SHAs are validated.
6. Expired facts fail unless marked stale or reverified.
7. Expiry cannot precede last verification.
8. `tos fact list` reports status, confidence, expiry, and statement.
9. `tos fact show TOS-FACT-001` returns the canonical record.
10. `tos fact validate 2026-07-25` passes the repository facts.
11. Invalid as-of dates fail.
12. Node.js 20 and 22 pass frozen-lockfile installation, build, typecheck, tests, canonical-state validation, contract controls, and fact controls.

## Evidence required before merge

- Exact implementation SHA.
- Node.js 20 and 22 workflow run.
- Successful `pnpm check`.
- Successful `tos fact list 2026-07-25` smoke output.
- Successful `tos fact show TOS-FACT-001 2026-07-25` output.
- Successful `tos fact validate 2026-07-25` output.
- Negative-control unit-test results.
- Canonical evidence-index and blocker updates.

## Definition of done

Batch 3A is complete only after exact-SHA CI passes on Node.js 20 and 22, evidence is recorded in `.tos/evidence-index.yaml`, its validation blocker is closed, the Truth Steward and truth-engine module are active, and the PR is merged.
