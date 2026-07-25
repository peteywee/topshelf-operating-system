# TopShelf Operating System

**Short name:** TOS  
**Foundation version:** 2.0.0  
**Runtime version:** 0.1.0  
**Decision date:** 2026-07-23  
**Owner:** Patrick Craven  
**Company:** Top Shelf Service LLC

TopShelf Operating System is the evidence-driven project operating system for Top Shelf Service LLC. It combines a complete named contract foundation with an executable kernel, canonical project state, validation, and an expanding command-line runtime.

The official and exclusive expansion of TOS is **TopShelf Operating System**.

## Governing rule

Every foundation concern is named in the contract catalog. Every project must evaluate every catalog entry as `required`, `conditional`, or `not_applicable`. A `not_applicable` decision requires a reason and authority. Absence of a contract is never interpreted as absence of the concern.

## Repository layout

- `.tos/` — authoritative machine-readable state for this project.
- `packages/shared/` — canonical types and identifiers.
- `packages/kernel/` — project discovery, state loading, and validation.
- `packages/contracts/` — contract catalog, change proposals, redlines, and impact analysis.
- `packages/cli/` — executable `tos` command surface.
- `contracts/` — agnostic templates for all named foundation concerns.
- `agents/` — governed agent-role specifications; these do not imply an autonomous runtime.
- `skills/` — reusable human-assisted operating instructions for agent roles.
- `schemas/` — machine-readable schemas for core TOS records.
- `registers/` — contract, terminology, decision, and requirement registers.
- `docs/` — formal decisions, operating specifications, and implementation batches.
- `examples/` — filled examples of core records.
- `visuals/` — Mermaid architecture and lifecycle sources.
- `final/` — publication DOCX and PDF.

## Runtime quick start

Requirements:

- Node.js 20 or 22
- pnpm 10.33.3 through Corepack

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm tos -- status
pnpm tos -- validate
pnpm tos -- contract validate
```

Command surface:

```bash
tos status
tos validate
tos contract list
tos contract show TOS-CTR-085
tos contract validate
tos contract propose TOS-CTR-085 TOS-CHG-2026-002 "Patrick Craven" "Clarify role authority"
tos contract change validate examples/contract-changes/TOS-CHG-2026-001.yaml
tos contract diff TOS-CTR-085 examples/contract-changes/drafts/TOS-CHG-2026-001_TOS-CTR-085.yaml
tos contract impact TOS-CTR-085
tos --version
tos --help
```

`contract propose`, `diff`, and `impact` generate review material. They do not approve, merge, or make proposed language effective.

## Current implementation status

TOS 0.1 Batch 1 established the repository kernel, canonical `.tos/` state, shared types, initial CLI, tests, and CI.

TOS 0.1 Batch 2A merged the executable 105-template contract catalog, pre-engine agent roster, and human-assisted Contract Steward and Contract Auditor specifications.

TOS 0.1 Batch 2B adds controlled change proposals, semantic-version classification, semantic redlines, and impact analysis. It still does **not** claim autonomous agent execution or approval authority.

See:

- `docs/implementation/tos-0.1-batch-1.md`
- `docs/implementation/tos-0.1-batch-2.md`
- `docs/architecture/pre-engine-agent-roster.md`

## Core implementation defaults

- Repository: `peteywee/topshelf-operating-system`
- CLI command: `tos`
- Runtime: TypeScript on Node.js 20 or 22, managed with pnpm 10.33.3
- Canonical project state: human-readable YAML under `.tos/`
- Derived local index/cache: SQLite, rebuildable from canonical records
- Append-only activity stream: `.tos/activity.jsonl`
- Contract IDs: `TOS-CTR-###`
- Contract change IDs: `TOS-CHG-YYYY-NNN`
- Versioning: Semantic Versioning
