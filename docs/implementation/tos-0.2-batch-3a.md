# TOS 0.2 — Batch 3A: Truth Steward and Canonical Facts

**Status:** merged  
**Implementation branch:** `agent/tos-0-2-batch-3a-truth-steward`  
**Base:** Batch 2C merge `f6da923529d9ccf3c2eb56140c05518fd52f83ed`  
**Merged commit:** `886720d0011fa0521244330ca9693510014308c2`  
**Pull request:** #7  
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

## Acceptance status

All twelve Batch 3A acceptance criteria passed at implementation SHA `7542a8ba9da352fe08281901f3bb152cf3c30a6a` in Actions run `30175902966` on Node.js 20 and 22:

- Frozen-lockfile installation passed without dependency changes.
- Strict build, typecheck, and all unit tests passed.
- The canonical fact catalog loaded in stable ID order.
- `tos fact list`, `show`, and `validate` passed at `2026-07-25`.
- Duplicate, contradictory, unsupported, and stale-control unit tests passed.
- The `2026-08-25` validation correctly rejected expired non-stale facts.
- Canonical state, all 105 contracts, contract change controls, owner authorization controls, and direct-edit protection remained green.

The final pre-merge state head `2b14ae209a686f1de830a41e9c155dd5240ea2f2` passed Actions run `30176038248` on Node.js 20 and 22. Canonical evidence is recorded as `TOS-EVD-006`; `TOS-BLK-005` is closed.

## Definition of done

Complete. The implementation, validation, evidence, blocker closure, Truth Steward specification, truth-engine activation, PR #7 merge, and post-merge closeout record are present.
