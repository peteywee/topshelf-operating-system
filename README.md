# TopShelf Operating System Foundation Contract Package

**Short name:** TOS  
**Version:** 2.0.0  
**Decision date:** 2026-07-23  
**Owner:** Patrick Craven  
**Company:** Top Shelf Service LLC

This package supersedes the earlier package that expanded TOS as "TopShelf Op Sys." The official and exclusive expansion is **TopShelf Operating System**.

## Governing rule

Every foundation concern is named in the contract catalog. Every project must evaluate every catalog entry as `required`, `conditional`, or `not_applicable`. A `not_applicable` decision requires a reason and authority. Absence of a contract is never interpreted as absence of the concern.

## Package layout

- `docs/` - formal decision baseline and operating specification.
- `contracts/` - agnostic contract templates for all named foundation concerns.
- `schemas/` - machine-readable schemas for core TOS records.
- `registers/` - complete contract, terminology, decision, and requirement registers.
- `examples/` - filled examples of core records.
- `visuals/` - Mermaid architecture and lifecycle sources.
- `final/` - publication DOCX and PDF.

## Core implementation defaults

- Repository: `topshelf-operating-system`
- CLI command: `tos`
- Runtime: TypeScript on Node.js 20+, managed with pnpm
- Canonical project state: human-readable YAML under `.tos/`
- Derived local index/cache: SQLite, rebuildable from canonical records
- Append-only activity stream: `.tos/activity.jsonl`
- Contract IDs: `TOS-CTR-###`
- Versioning: Semantic Versioning
