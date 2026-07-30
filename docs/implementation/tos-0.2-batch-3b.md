# TOS 0.2 — Batch 3B: Decision-Ready Truth

**Status:** implementation in progress  
**Branch:** `agent/tos-0-2-batch-3b-decision-ready-truth`  
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

## Acceptance criteria

1. Same-claim yes/no contradictions fail reconciliation.
2. Equivalent duplicate claims are reported without making the catalog invalid.
3. Authority and verification-class disagreement is explicit.
4. Material conflicts require human resolution; no winner is selected automatically.
5. Requirements require stable IDs, owners, governing facts, contracts, acceptance criteria, and evidence requirements.
6. Unknown, stale, conflicting, or materially disputed facts cannot support executable requirements.
7. Requirement trace output includes the requirement and its governing facts.
8. Existing Batch 1–3A and contract controls remain green.
9. Node.js 20 and 22 pass frozen-lockfile build, typecheck, tests, and CLI smoke paths.

## Autonomous-agent boundary

This batch does not execute agents. It produces decision-ready inputs for the future Planner and work-order compiler. A future work order may be compiled only from requirements whose governing facts are current and free of unresolved material conflicts.

## Definition of done

Complete only after exact-SHA Node.js 20/22 CI passes, evidence is recorded, the validation blocker is closed, the PR merges, and post-merge state is reconciled.
