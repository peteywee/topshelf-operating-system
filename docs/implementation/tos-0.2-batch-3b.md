# TOS 0.2 — Batch 3B: Decision-Ready Truth

**Status:** merged  
**Implementation branch:** `agent/tos-0-2-batch-3b-decision-ready-truth`  
**Merged commit:** `26f22db879f7c904b5d0fd78e1ce0c4a33e9bb68`  
**Pull request:** #9  
**Owner:** Patrick Craven

## Goal

Make canonical truth safe for bounded agent planning by detecting material disagreement and linking trustworthy facts to owned requirements, applicable contracts, acceptance criteria, and required evidence.

## Lean constraints

- No new package.
- No database, cache, daemon, scheduler, or event bus.
- No new autonomous agent.
- No automatic conflict resolution.
- No duplicate canonical traceability file; requirements contain their own links.
- Existing YAML and Git history remain authoritative.

## Runtime scope

- `packages/kernel/src/reconcile.ts`
- `packages/kernel/src/requirements.ts`
- `.tos/requirements.yaml`
- Thin CLI handlers only

## Commands

```bash
tos fact reconcile [as-of-date]
tos fact conflicts [as-of-date]
tos requirement list [as-of-date]
tos requirement show <id> [as-of-date]
tos requirement validate [as-of-date]
tos requirement trace <id> [as-of-date]
tos requirement gaps [as-of-date]
```

## Acceptance status

All nine acceptance criteria passed at implementation SHA `309c029bf5c7cde150d8bae2c40a6184f8e2c17c` in Actions run `30573149502` on Node.js 20 and 22:

1. Same-claim yes/no contradictions fail reconciliation.
2. Equivalent duplicate claims are warnings rather than invalidating errors.
3. Authority and verification-class disagreements are reported independently.
4. Material conflicts require human resolution; no winner is selected automatically.
5. Requirements require IDs, owners, facts, contracts, acceptance criteria, and evidence.
6. Unsafe or materially disputed facts cannot support executable requirements.
7. Requirement trace output includes each requirement and its governing facts.
8. Every Batch 1–3A and contract control remained green.
9. Frozen-lockfile installation, strict build, typecheck, tests, and CLI smoke paths passed on both runtimes.

The final pre-merge canonical-state head `8321a20d6d997f310dbd1bc8b2914b13ae115181` passed Actions run `30573605449` on Node.js 20 and 22. Canonical evidence is `TOS-EVD-007`; `TOS-BLK-006` is closed.

## Autonomous-agent boundary

This batch does not execute agents. It produces decision-ready inputs for the future Planner and work-order compiler. A future work order may be compiled only from requirements whose governing facts are current and free of unresolved material conflicts.

## Definition of done

Complete. The implementation, validation, evidence, blocker closure, PR #9 merge, and post-merge closeout record are present.
