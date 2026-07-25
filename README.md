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
- `packages/cli/` — executable `tos` command surface.
- `contracts/` — agnostic templates for all named foundation concerns.
- `schemas/` — machine-readable schemas for core TOS records.
- `registers/` — contract, terminology, decision, and requirement registers.
- `docs/` — formal decisions, operating specifications, and implementation batches.
- `examples/` — filled examples of core records.
- `visuals/` — Mermaid architecture and lifecycle sources.
- `final/` — publication DOCX and PDF.

## Runtime quick start

Requirements:

- Node.js 20
- pnpm 10 or later

```bash
corepack enable
pnpm install
pnpm check
pnpm tos -- status
pnpm tos -- validate
```

Initial commands:

```bash
tos status
tos validate
tos --version
tos --help
```

## Current implementation status

TOS 0.1 Batch 1 establishes the repository kernel, canonical `.tos/` state, shared types, initial CLI, tests, and CI. It does **not** claim that intake, truth reconciliation, module management, scheduling, agents, evidence automation, promotion, recovery, or adapters are complete.

See `docs/implementation/tos-0.1-batch-1.md` for exact scope, acceptance criteria, evidence requirements, and definition of done.

## Core implementation defaults

- Repository: `peteywee/topshelf-operating-system`
- CLI command: `tos`
- Runtime: TypeScript on Node.js 20+, managed with pnpm
- Canonical project state: human-readable YAML under `.tos/`
- Derived local index/cache: SQLite, rebuildable from canonical records
- Append-only activity stream: `.tos/activity.jsonl`
- Contract IDs: `TOS-CTR-###`
- Versioning: Semantic Versioning
