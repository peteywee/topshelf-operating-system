# TopShelf Operating System

**Short name:** TOS  
**Foundation version:** 2.0.0  
**Runtime version:** 0.2.1  
**Decision date:** 2026-07-23  
**Owner:** Patrick Craven  
**Company:** Top Shelf Service LLC

TopShelf Operating System is the lean evidence-driven control layer for Top Shelf Service LLC projects and operations. It combines named contracts, canonical state, decision-ready truth, governed intake, project tailoring, bounded requirements, validation, and an expanding command-line runtime.

## Authority boundary

TOS is the canonical authority for TopShelf terminology, intake answer validity, project-versus-operation classification, Lite/Standard/Controlled project tiering, required artifact selection, module decisions, authorization blockers, and future work-order execution.

`peteywee/topshelf-project-template` is a downstream generator. It may consume TOS decisions and generate files, but it must not maintain a competing intake or tailoring authority.

## Governing rules

Every concern is named, every fact separates observed state from target state, and every executable requirement traces to current facts, applicable contracts, acceptance criteria, and required evidence. TOS reports material conflicts but does not silently choose a winner. Unknown high-control intake answers block authorization rather than being treated as no.

## Repository layout

- `.tos/` — authoritative project state, facts, requirements, boot authority, evidence, decisions, blockers, and activity.
- `standards/intake/` — canonical TopShelf question definitions, valid and invalid examples, module rules, project classification, tiering, and artifact tailoring.
- `packages/shared/` — canonical types and runtime identifiers.
- `packages/kernel/` — state, truth, reconciliation, requirements, repository inspection, intake evaluation, and boot validation.
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
pnpm tos -- intake questions
pnpm tos -- intake explain needs_autonomous_agents
pnpm tos -- intake validate examples/intake/controlled-autonomy.answers.json
pnpm tos -- intake evaluate examples/intake/controlled-autonomy.answers.json
pnpm tos -- fact validate 2026-07-25
pnpm tos -- fact reconcile 2026-07-25
pnpm tos -- requirement validate 2026-07-25
pnpm tos -- inspect 2026-07-30
pnpm tos -- boot validate 2026-07-30
pnpm tos -- contract validate
pnpm contract:guard
```

## Canonical intake commands

```bash
tos intake [as-of-date]
tos intake unresolved [as-of-date]
tos intake questions
tos intake explain <question-id>
tos intake validate <answers.json>
tos intake evaluate <answers.json>
```

`tos intake questions` exposes all 33 governed terms with definitions, answer types, follow-up questions, valid examples, and invalid examples. `tos intake evaluate` returns normalized answers, work classification, project tier, tier triggers, required artifacts, selected modules, assumptions, follow-up questions, blockers, and authorization readiness.

Supported yes/no answers are `yes`, `no`, `unknown`, and `not_applicable`. Unsupported values such as `maybe` fail validation. A hybrid intake that mixes a temporary project with the ongoing operation it creates is blocked until the scopes are separated.

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

## Inspect and boot commands

```bash
tos inspect [as-of-date]
tos boot show [as-of-date]
tos boot validate [as-of-date]
```

Inspection derives repository evidence and unresolved questions. `.tos/boot.yaml` records Patrick-approved module decisions, reserved actions, and role modes by reference; it does not copy canonical facts or requirements. Boot validation rejects premature autonomous modes.

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
- TOS 0.2 Batch 3C: lean repository inspection and owner-authorized boot packet — merged.
- TOS 0.2.1: canonical TopShelf intake terminology and project tailoring — validated; merge pending.

TOS does not yet include autonomous execution, a scheduler, persistent agent memory, automatic conflict resolution, or automatic legal approval.

## Core defaults

- Repository: `peteywee/topshelf-operating-system`
- CLI command: `tos`
- Runtime: TypeScript on Node.js 20 or 22, pnpm 10.33.3
- Canonical state: YAML under `.tos/`
- Canonical intake standards: JSON under `standards/intake/`
- Append-only activity: `.tos/activity.jsonl`
- Contract IDs: `TOS-CTR-###`
- Contract change IDs: `TOS-CHG-YYYY-NNN`
- Fact IDs: `TOS-FACT-###`
- Requirement IDs: `TOS-REQ-###`
- Acceptance criterion IDs: `TOS-AC-###`
- Versioning: Semantic Versioning
