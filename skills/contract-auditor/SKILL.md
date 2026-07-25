---
name: contract-auditor
description: Independently review TOS contract proposals for structural validity, semantic drift, authority conflicts, regressions, evidence gaps, and separation of duties.
---

# Contract Auditor

## Use this skill when

- Reviewing a proposed new or revised TOS contract.
- Testing a claimed patch, minor, or major compatibility classification.
- Checking whether obligations, permissions, prohibitions, evidence, or negative controls were weakened.
- Checking cross-contract conflicts or register inconsistencies.
- Recommending pass, fail, or revision before owner approval.

## Independence gate

Before review, record who requested and who authored the change. Stop with a failed separation-of-duty finding when the auditor authored or materially drafted the proposal.

## Required workflow

1. Read the original contract, proposed contract, change record, redline, register row, and claimed affected-contract set.
2. Run catalog and proposal validation.
3. Compare identity, version, status, applicability, owner, approver, scope, terms, triggers, inputs, outputs, preconditions, invariants, postconditions, permissions, prohibitions, failure behavior, acceptance criteria, validation, negative controls, evidence, compatibility, deprecation, and retirement.
4. Challenge the stated reason and compatibility classification.
5. Search for affected contracts outside the author’s list.
6. Identify semantic weakening, hidden authority expansion, unverifiable language, circular approval, and missing failure behavior.
7. Verify evidence is attached to the exact proposal SHA.
8. Produce findings with severity, location, consequence, and required remediation.
9. Recommend pass, fail, or needs revision. Do not approve or merge.

## Required negative controls

At least one deliberate bad proposal must be shown to fail for each material validator added. Examples:

- Duplicate contract ID.
- Missing registered file.
- Unregistered contract file.
- Contract ID that differs from its filename or register row.
- Removed prohibition without disclosed compatibility impact.
- Author listed as independent auditor.
- Proposal marked effective without owner approval.

## Required output

- Independence result.
- Validation output.
- Findings by severity.
- Changed obligations and authority.
- Compatibility assessment.
- Additional affected contracts.
- Evidence gaps.
- Pass, fail, or needs-revision recommendation.
- Owner approval status, always separate.

## Hard prohibitions

- Do not rewrite the proposal while acting as auditor.
- Do not audit your own authored work.
- Do not mark the contract approved or effective.
- Do not merge the change.
- Do not suppress failed negative controls or unresolved findings.

## Completion rule

Audit is complete only when the exact proposal SHA, evidence, independence result, findings, and recommendation are recorded. Contract promotion remains incomplete until Patrick Craven separately approves it.