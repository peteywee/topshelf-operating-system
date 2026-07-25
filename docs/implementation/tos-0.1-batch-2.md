# TOS 0.1 — Batch 2: Contract Registry and Stewardship

**Status:** Batch 2A merged; Batch 2B implementation in progress  
**Current branch:** `agent/tos-0-1-batch-2b-contract-changes`  
**Base:** Batch 2A merge `8d7e2f7beecd0218bc4b5b9e92b0341c49d0000e` on `main`  
**Owner:** Patrick Craven

## Goal

Make the 105-contract foundation executable and safely changeable without building the autonomous agent engine prematurely.

## Internal batches

### Batch 2A — Catalog and governed roles — merged

- Loads `registers/contract-register.csv` and all contract YAML templates.
- Enforces contract count, unique IDs, registered paths, required sections, and ID/path consistency.
- Provides `tos contract list`, `tos contract show <id>`, and `tos contract validate`.
- Defines the pre-engine agnostic agent roster.
- Defines the Contract Steward and independent Contract Auditor.
- Adds reusable skills for contract authoring and audit.

### Batch 2B — Controlled change proposals — current

- Add a contract change-record schema and example package.
- Generate a controlled proposal without modifying approved contract language.
- Validate requester, reason, versions, change class, draft path, affected contracts, review state, and evidence structure.
- Produce deterministic semantic redlines between the current contract and a proposed draft.
- Classify patch, minor, and major semantic-version changes and reject unchanged or downgraded versions.
- Report direct contract references separately from same-category and same-owner review candidates.
- Preserve Contract Steward authorship while leaving Contract Auditor and owner approval pending.

Commands:

```bash
pnpm tos -- contract propose TOS-CTR-085 TOS-CHG-2026-002 "Patrick Craven" "Clarify role authority"
pnpm tos -- contract change validate examples/contract-changes/TOS-CHG-2026-001.yaml
pnpm tos -- contract diff TOS-CTR-085 examples/contract-changes/drafts/TOS-CHG-2026-001_TOS-CTR-085.yaml
pnpm tos -- contract impact TOS-CTR-085
```

### Batch 2C — Authorization and evidence — next

- Require independent Contract Auditor review and Patrick Craven’s owner approval before effectiveness.
- Prove the author cannot approve or audit the same change.
- Enforce change records for modifications under `contracts/**`.
- Add evidence records, negative controls, CI enforcement, and promotion gates.
- Reconcile the register and package manifest after approved changes.

## Explicitly out of scope

- Autonomous agent scheduling or execution.
- Persistent agent memory.
- General tool dispatch.
- Truth reconciliation outside contract metadata.
- Legal advice or automatic legal approval.
- Provider adapters.

## Batch 2A acceptance status

All Batch 2A criteria passed on Node.js 20 and 22 and were recorded as `TOS-EVD-003`. PR #4 was merged to `main` as `8d7e2f7beecd0218bc4b5b9e92b0341c49d0000e`.

## Batch 2B acceptance criteria

1. `schemas/contract-change.schema.json` defines the proposal envelope.
2. `tos contract propose` emits a structurally valid draft with a stable contract ID and pending independent approvals.
3. Proposal IDs use `TOS-CHG-YYYY-NNN` and contract IDs use `TOS-CTR-NNN`.
4. A proposal requires requester, reason, current version, proposed version, change class, compatibility summary, draft path, and affected-contract list.
5. Patch, minor, and major version increases are classified correctly.
6. Unchanged, downgraded, or malformed versions fail validation.
7. A declared change class that disagrees with the semantic-version change fails validation.
8. `tos contract diff` produces deterministic field-path changes.
9. `tos contract impact` distinguishes direct references from review candidates.
10. The example proposal validates and its example draft produces a non-empty redline.
11. The proposal leaves Contract Auditor and owner approval pending.
12. CI runs the complete workflow on Node.js 20 and 22 using the frozen lockfile.

## Batch 2B evidence required before merge

- Exact commit SHA.
- Node.js 20 and 22 CI run.
- Build, typecheck, and all unit-test output.
- Successful example proposal validation.
- Generated proposal scaffold output.
- Semantic redline output.
- Impact report output.
- Negative-control proof for invalid versions and mismatched change classes.
- Clean working tree and unchanged lockfile unless dependency metadata legitimately changes.

## Definition of done

Batch 2 is complete only after 2A, 2B, and 2C are validated at exact SHAs, CI passes, evidence is indexed, owner approval is recorded, and all batch PRs are merged. The existence of agent files does not imply an autonomous agent engine.
