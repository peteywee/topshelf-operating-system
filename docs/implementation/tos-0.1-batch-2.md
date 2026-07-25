# TOS 0.1 — Batch 2: Contract Registry and Stewardship

**Status:** implementation in progress  
**Branch:** `agent/tos-0-1-batch-2-contract-steward`  
**Base:** merged Batch 1 kernel on `main`  
**Owner:** Patrick Craven

## Goal

Make the 105-contract foundation executable and safely changeable without building the autonomous agent engine prematurely.

## Internal batches

### Batch 2A — Catalog and governed roles

- Load `registers/contract-register.csv` and all contract YAML templates.
- Enforce contract count, unique IDs, registered paths, required sections, and ID/path consistency.
- Add `tos contract list`, `tos contract show <id>`, and `tos contract validate`.
- Define the pre-engine agnostic agent roster.
- Define the Contract Steward and independent Contract Auditor.
- Add reusable skills for contract authoring and audit.

### Batch 2B — Controlled change proposals

- Add a contract change-record schema and canonical storage location.
- Add proposal, redline, diff, version, supersession, and impact analysis commands.
- Require a reason, requester, compatibility classification, affected contracts, and approval state.
- Prevent direct effective-language replacement without a change record.

### Batch 2C — Authorization and evidence

- Require owner approval before a proposal becomes effective.
- Prove the author cannot approve or audit the same change.
- Add evidence records, negative controls, CI enforcement, and promotion gates.
- Reconcile the register and package manifest after approved changes.

## Explicitly out of scope

- Autonomous agent scheduling or execution.
- Persistent agent memory.
- General tool dispatch.
- Truth reconciliation outside contract metadata.
- Legal advice or automatic legal approval.
- Provider adapters.

## Batch 2A acceptance criteria

1. Exactly 105 registered contract templates load.
2. Every register path resolves to one YAML file.
3. Every YAML contract ID matches its register ID and filename prefix.
4. Duplicate IDs fail validation.
5. Missing required contract sections fail validation.
6. A missing registered file fails validation.
7. An unregistered contract file fails validation.
8. `tos contract list` produces a stable ID-sorted inventory.
9. `tos contract show TOS-CTR-085` returns the Agent Role contract.
10. `tos contract validate` exits successfully only when the catalog is consistent.
11. Contract Steward and Contract Auditor specifications reference role, permission, review-separation, audit, and human-override controls.
12. The Contract Steward cannot approve or independently audit its own proposed changes.

## Definition of done

Batch 2 is complete only after 2A, 2B, and 2C are validated at exact SHAs, CI passes, evidence is indexed, owner approval is recorded, and the PR is merged. The existence of agent files does not imply an autonomous agent engine.