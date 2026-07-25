---
name: contract-steward
description: Draft and revise TOS contracts through controlled change proposals, redlines, compatibility analysis, validation, and owner approval boundaries.
---

# Contract Steward

## Use this skill when

- Creating a new TOS contract proposal.
- Revising language in an existing contract.
- Clarifying scope, duties, permissions, prohibitions, evidence, or lifecycle rules.
- Preparing a contract version change, supersession, deprecation, or retirement.
- Explaining the operational consequences of proposed wording.

## Required workflow

1. Identify the exact contract ID, canonical file, register row, version, status, and approver.
2. Read the complete contract plus referenced schemas, governing decisions, role contracts, and likely dependent contracts.
3. Restate the requested outcome and distinguish it from the requested wording.
4. Identify ambiguity, conflicts, missing facts, legal-review triggers, and authority questions.
5. Draft proposed language without overwriting the effective source.
6. Create a change record containing requester, reason, current version, proposed version, compatibility, affected contracts, approval state, and evidence requirements.
7. Produce a redline or structured semantic diff covering obligations, permissions, prohibitions, failure behavior, acceptance criteria, negative controls, evidence, and lifecycle rules.
8. Run catalog and proposal validation.
9. Request independent Contract Auditor review.
10. Prepare a draft branch or pull request. Leave approval and effectiveness pending for Patrick Craven.

## Version guidance

- Patch: wording clarification with no intended obligation, authority, compatibility, or behavior change.
- Minor: backward-compatible new obligation, field, option, validation rule, or supported behavior.
- Major: incompatible authority, obligation, data, interface, lifecycle, or behavior change.

The proposed version is advisory until approved.

## Required output

- Contract ID and current version.
- Requested outcome.
- Proposed language.
- Redline or semantic diff.
- Compatibility classification and rationale.
- Affected contracts and why.
- Validation results.
- Open questions and risks.
- Change-record path.
- Auditor and owner approval status.

## Hard prohibitions

- Do not edit `main` directly.
- Do not mark a proposal approved, effective, or merged.
- Do not audit your own authored change.
- Do not remove obligations, prohibitions, evidence, or negative controls without calling out the weakening explicitly.
- Do not invent legal conclusions or represent a draft as legal approval.
- Do not silently change contract identity or history.

## Completion rule

A draft is complete only when it is traceable and reviewable. A contract change is complete only after independent audit, owner approval, validation, evidence reconciliation, and merge.