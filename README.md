# TopShelf Operating System

**Short name:** TOS  
**Foundation version:** 2.0.0  
**Runtime version:** 0.2.0  
**Decision date:** 2026-07-23  
**Owner:** Patrick Craven  
**Company:** Top Shelf Service LLC

TopShelf Operating System is the lean evidence-driven control layer for Top Shelf Service LLC projects. It combines named contracts, canonical state, decision-ready truth, bounded requirements, validation, and an expanding command-line runtime.

## Governing rules

Every concern is named, every fact separates observed state from target state, and every executable requirement traces to current facts, applicable contracts, acceptance criteria, and required evidence. TOS reports material conflicts but does not silently choose a winner.

## Repository layout

- `.tos/` — authoritative project state, facts, requirements, evidence, decisions, blockers, and activity.
- `packages/shared/` — canonical types and runtime identifiers.
- `packages/kernel/` — state, truth, reconciliation, and requirements validation.
- `packages/contracts/` — contract catalog and change authorization.
- `packages/cli/` — executable `tos` command surface.
- `contracts/` — agnostic templates for named foundation concerns.
- `agents/` and `skills/` — governed human-assisted roles and instructions, not an autonomous runtime.

## Runtime quick start

Requirements: Node.js 20 or 22 and pnpm 10.33.3 through Corepack.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm tos -- validate
pnpm tos -- fact validate 2026-07-25
pnpm tos -- fact reconcile 2026-07-25
pnpm tos -- requirement validate 2026-07-25
pnpm tos -- contract validate
pnpm contract:guard
```

## Decision-ready truth commands

```bash
tos fact list [as-of-date]
tos fact show TOS-FACT-001 [as-of-date]
tos fact validate [as-of-date]
tos fact reconcile [as-of-date]
tos fact conflicts [as-of-date]
tos requirement list [as-of-date]
tos requirement show TOS-REQ-001 [as-of-date]
tos requirement validate [as-of-date]
tos requirement trace TOS-REQ-001 [as-of-date]
tos requirement gaps [as-of-date]
```

Reconciliation detects duplicate claims, opposite observed states, authority disagreement, and verified-versus-declared disagreement. Requirements based on stale, unknown, conflicting, or materially disputed facts fail validation.

## Contract commands

```bash
tos contract list
tos contract show TOS-CTR-085
tos contract validate
tos contract propose TOS-CTR-085 TOS-CHG-2026-002 "Patrick Craven" "Clarify role authority"
tos contract change validate examples/contract-changes/TOS-CHG-2026-001.yaml
tos contract diff TOS-CTR-085 examples/contract-changes/drafts/TOS-CHG-2026-001_TOS-CTR-085.yaml
tos contract impact TOS-CTR-085
tos contract gate <approved-proposal-path> "Patrick Craven"
```

## Lean autonomous direction

TOS will use four logical roles: Planner, Worker, Verifier, and Promoter. Specialized behavior remains skills rather than separate persistent agents. Git branches and canonical files remain the initial lease, history, isolation, and rollback mechanism.

The future Planner may compile work only from requirements whose governing facts are current and free of unresolved material conflicts. Workers cannot verify their own completion, and reserved promotion decisions remain with Patrick Craven.

## Current implementation status

- Batch 1: repository kernel and canonical state — merged.
- Batch 2A–2C: contract catalog, controlled changes, authorization, and direct-edit protection — merged.
- TOS 0.2 Batch 3A: canonical fact validation and freshness controls — merged.
- TOS 0.2 Batch 3B: decision-ready truth reconciliation and requirement traceability — merged.

TOS does not yet include autonomous execution, a scheduler, persistent agent memory, automatic conflict resolution, or automatic legal approval.

## Core defaults

- Repository: `peteywee/topshelf-operating-system`
- CLI command: `tos`
- Runtime: TypeScript on Node.js 20 or 22, pnpm 10.33.3
- Canonical state: YAML under `.tos/`
- Append-only activity: `.tos/activity.jsonl`
- Contract IDs: `TOS-CTR-###`
- Contract change IDs: `TOS-CHG-YYYY-NNN`
- Fact IDs: `TOS-FACT-###`
- Requirement IDs: `TOS-REQ-###`
- Acceptance criterion IDs: `TOS-AC-###`
- Versioning: Semantic Versioning
