# TopShelf Operating System

**Short name:** TOS  
**Foundation version:** 2.0.0  
**Runtime version:** 0.2.0  
**Decision date:** 2026-07-23  
**Owner:** Patrick Craven  
**Company:** Top Shelf Service LLC

TopShelf Operating System is the evidence-driven project operating system for Top Shelf Service LLC. It combines a complete named contract foundation with an executable kernel, canonical state, governed facts, validation, and an expanding command-line runtime.

The official and exclusive expansion of TOS is **TopShelf Operating System**.

## Governing rules

Every foundation concern is named in the contract catalog. Every project must evaluate every catalog entry as `required`, `conditional`, or `not_applicable`; absence of a contract is never interpreted as absence of the concern.

Every canonical fact must distinguish observed state from target state and carry provenance, authority, confidence, freshness, and invalidation conditions. Repetition or confidence alone does not make a statement verified.

## Repository layout

- `.tos/` — authoritative project state, canonical facts, evidence, decisions, blockers, and real approved contract-change records.
- `packages/shared/` — canonical types and runtime identifiers.
- `packages/kernel/` — project discovery, state validation, and truth validation.
- `packages/contracts/` — catalog, proposals, redlines, impact analysis, and authorization gates.
- `packages/cli/` — executable `tos` command surface.
- `contracts/` — agnostic templates for all named foundation concerns.
- `agents/` and `skills/` — governed human-assisted roles and operating instructions; they do not imply an autonomous runtime.
- `schemas/`, `registers/`, `docs/`, `examples/`, `visuals/`, and `final/` — supporting records and publication assets.

## Runtime quick start

Requirements: Node.js 20 or 22 and pnpm 10.33.3 through Corepack.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm check
pnpm tos -- validate
pnpm tos -- fact validate 2026-07-25
pnpm tos -- contract validate
pnpm contract:guard
```

## Truth command surface

```bash
tos fact list [as-of-date]
tos fact show TOS-FACT-001 [as-of-date]
tos fact validate [as-of-date]
```

Fact validation rejects duplicate IDs, contradictory status/state pairs, invalid provenance, missing invalidation conditions, malformed dates or SHAs, and facts that exceed their freshness window without being reverified or marked stale.

## Contract command surface

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

Proposal, diff, and impact commands generate review material. The gate reports authorization readiness but does not merge or edit a contract. `pnpm contract:guard` blocks changed canonical contract files that lack a matching authorized record.

## Governance chains

```text
Contract Steward
    → Contract Auditor
    → Evidence Steward
    → Release & Promotion Steward
    → Patrick Craven owner approval
```

The Truth Steward maintains fact classification and provenance but cannot silently resolve conflicts, approve business policy, fabricate evidence, or declare implementation complete.

## Current implementation status

- Batch 1: repository kernel and canonical state — merged.
- Batch 2A: validated 105-template catalog, Contract Steward, and Contract Auditor — merged.
- Batch 2B: controlled proposals, versions, redlines, and impact analysis — merged.
- Batch 2C: independent audit, evidence, owner approval, promotion gate, and direct-edit protection — merged.
- TOS 0.2 Batch 3A: Truth Steward, canonical fact validation, freshness controls, and fact CLI — merged.

The governed roles remain human-assisted specifications. TOS does not yet include an autonomous agent engine, scheduler, persistent agent memory, automatic conflict resolution, or automatic legal approval.

See `docs/implementation/tos-0.1-batch-2.md`, `docs/implementation/tos-0.2-batch-3a.md`, and `docs/architecture/pre-engine-agent-roster.md`.

## Core implementation defaults

- Repository: `peteywee/topshelf-operating-system`
- CLI command: `tos`
- Runtime: TypeScript on Node.js 20 or 22, managed with pnpm 10.33.3
- Canonical project state: human-readable YAML under `.tos/`
- Append-only activity stream: `.tos/activity.jsonl`
- Contract IDs: `TOS-CTR-###`
- Contract change IDs: `TOS-CHG-YYYY-NNN`
- Fact IDs: `TOS-FACT-###`
- Versioning: Semantic Versioning
