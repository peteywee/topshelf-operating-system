# TOS 0.1 — Batch 2: Contract Registry and Stewardship

**Status:** Batches 2A and 2B merged; Batch 2C validated and ready for merge  
**Current branch:** `agent/tos-0-1-batch-2c-contract-authorization`  
**Base:** Batch 2B merge `9216b698d199b2cf656199c0b5f9cb1eeb1fb071` on `main`  
**Owner:** Patrick Craven

## Goal

Make the 105-contract foundation executable and safely changeable without building the autonomous agent engine prematurely.

## Internal batches

### Batch 2A — Catalog and governed roles — merged

- Loads and reconciles the 105 contract templates and register.
- Provides contract inventory and structural validation commands.
- Defines the Contract Steward and independent Contract Auditor.

Evidence: `TOS-EVD-003`. Merge: `8d7e2f7beecd0218bc4b5b9e92b0341c49d0000e`.

### Batch 2B — Controlled change proposals — merged

- Adds controlled change proposals, semantic-version classification, structural validation, deterministic redlines, and impact analysis.
- Preserves stable contract IDs and leaves audit and owner approval pending after authorship.

Evidence: `TOS-EVD-004`. Merge: `9216b698d199b2cf656199c0b5f9cb1eeb1fb071`.

### Batch 2C — Authorization, evidence, and promotion gates — validated

- Requires a passed independent Contract Auditor review.
- Prevents self-audit by comparing recorded author and auditor actors.
- Requires expected-owner approval, date, and decision record.
- Requires an authorized canonical target path.
- Requires change-record, redline, impact-report, audit, and owner-approval evidence classes.
- Rejects canonical contract edits without a matching approved record under `.tos/contract-changes/approved/`.
- Specifies the Evidence Steward and Release & Promotion Steward as human-assisted pre-engine roles.
- Proves a fictional simulation packet passes only for its fictional owner and fails when Patrick Craven is expected.

Evidence: `TOS-EVD-005`. Validated SHA: `fdaeaf5941482ca2607a3e724da46a1c223dc481`. Actions run: `30175022353` on Node.js 20 and 22.

## Governed role chain

```text
Contract Steward
    → Contract Auditor
    → Evidence Steward
    → Release & Promotion Steward
    → Patrick Craven owner approval
```

Each role may block promotion. None may replace Patrick’s approval for a real TOS contract change.

## Command surface

```bash
pnpm tos -- contract validate
pnpm tos -- contract propose <contract-id> <change-id> <requester> <reason>
pnpm tos -- contract change validate <proposal-path>
pnpm tos -- contract diff <contract-id> <draft-path>
pnpm tos -- contract impact <contract-id>
pnpm tos -- contract gate <approved-proposal-path> "Patrick Craven"
pnpm contract:guard
```

## Explicitly out of scope

- Autonomous agent scheduling or execution.
- Persistent agent memory.
- General tool dispatch.
- Truth reconciliation outside contract metadata.
- Legal advice or automatic legal approval.
- Provider adapters.
- Applying the simulation fixture to canonical contract language.

## Batch 2C acceptance status

All acceptance criteria passed on Node.js 20 and 22:

1. A complete fictional packet passed for `Example Owner`.
2. The same packet failed when `Patrick Craven` was expected.
3. Pending approval, failed audit, self-audit, owner mismatch, missing evidence, and unauthorized direct edits failed negative controls.
4. The branch-level direct-edit guard passed because no canonical contract YAML changed.
5. `.tos/contract-changes/approved/` contains only its governance README and no fictional YAML approval.
6. Evidence Steward and Release & Promotion Steward specifications preserve separation of duties and Patrick’s authority.

## Definition of done

Batch 2 is complete when PR #6 is merged after the final documentation-only CI run. Real contract-language promotion remains impossible until Patrick Craven separately approves a specific real change packet. Agent specifications remain human-assisted and do not imply an autonomous agent engine.
