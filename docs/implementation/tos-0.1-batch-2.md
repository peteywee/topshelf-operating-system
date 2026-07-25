# TOS 0.1 — Batch 2: Contract Registry and Stewardship

**Status:** Batches 2A and 2B merged; Batch 2C implementation in progress  
**Current branch:** `agent/tos-0-1-batch-2c-contract-authorization`  
**Base:** Batch 2B merge `9216b698d199b2cf656199c0b5f9cb1eeb1fb071` on `main`  
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

Evidence: `TOS-EVD-003`. Merge: `8d7e2f7beecd0218bc4b5b9e92b0341c49d0000e`.

### Batch 2B — Controlled change proposals — merged

- Adds the contract change-record schema and proposal model.
- Generates controlled proposals without modifying canonical contract language.
- Validates requester, reason, versions, change class, draft path, affected contracts, review state, and evidence structure.
- Produces deterministic semantic redlines.
- Classifies semantic-version changes and rejects unchanged, downgraded, malformed, or mismatched versions.
- Reports direct contract references separately from category and owner-function review candidates.

Evidence: `TOS-EVD-004`. Merge: `9216b698d199b2cf656199c0b5f9cb1eeb1fb071`.

### Batch 2C — Authorization, evidence, and promotion gates — current

- Requires an approved proposal before canonical promotion.
- Requires a passed independent Contract Auditor review.
- Proves the Contract Steward author and Contract Auditor actor are different.
- Requires the expected owner’s approval, decision date, and decision record.
- Requires an authorized target contract path under `contracts/**`.
- Requires change-record, redline, impact-report, audit, and owner-approval evidence classes.
- Adds a branch-level guard that rejects canonical contract edits without a matching authorized record under `.tos/contract-changes/approved/`.
- Specifies the Evidence Steward and Release & Promotion Steward before the autonomous engine exists.
- Uses a clearly labeled fictional approval packet solely to exercise the automated gate.

Commands:

```bash
pnpm tos -- contract gate <approved-proposal-path> "Patrick Craven"
pnpm contract:guard
```

## Governed role chain

```text
Contract Steward
    → Contract Auditor
    → Evidence Steward
    → Release & Promotion Steward
    → Patrick Craven owner approval
```

Each role may block promotion. None may replace Patrick’s approval for a real TOS contract change.

## Explicitly out of scope

- Autonomous agent scheduling or execution.
- Persistent agent memory.
- General tool dispatch.
- Truth reconciliation outside contract metadata.
- Legal advice or automatic legal approval.
- Provider adapters.
- Applying the simulated example to canonical contract language.

## Batch 2C acceptance criteria

1. `tos contract gate` authorizes a complete fictional test packet when invoked with its fictional expected owner.
2. The same packet fails when evaluated against `Patrick Craven`, proving the simulation cannot impersonate real owner approval.
3. Pending or rejected owner state fails promotion.
4. Missing or failed Contract Auditor review fails promotion.
5. The author auditing the same change fails promotion.
6. Missing steward actor, auditor actor, audit date, findings, owner date, or owner decision record fails promotion.
7. Missing required evidence classes fails promotion.
8. Invalid, missing, or unauthorized promotion target information fails promotion.
9. A changed canonical contract file without a matching approved change record fails the direct-edit guard.
10. A matching authorized proposal passes the pure direct-edit authorization test.
11. CI runs the gate and direct-edit guard on Node.js 20 and 22 with a frozen lockfile and full Git history.
12. `.tos/contract-changes/approved/` contains no fictional YAML approval records.
13. Evidence Steward and Release & Promotion Steward specifications and skills preserve separation of duties and owner authority.

## Batch 2C evidence required before merge

- Exact reviewed commit SHA.
- Successful Node.js 20 and 22 CI run.
- Unit-test proof for self-audit, missing approval, owner mismatch, missing evidence, and unauthorized direct edits.
- Successful simulation-only authorization-gate output.
- Successful no-contract-change branch guard output.
- Confirmation that canonical approved-change storage contains no simulation YAML.
- `TOS-EVD-005` updated to verified and `TOS-BLK-004` closed.

## Definition of done

Batch 2 is complete when 2A, 2B, and 2C infrastructure is validated at exact SHAs, CI passes, evidence is indexed, validation blockers are closed, and all three batch PRs are merged. Real contract-language promotion remains impossible until Patrick Craven separately approves a specific real change packet. The existence of agent specifications does not imply an autonomous agent engine.
