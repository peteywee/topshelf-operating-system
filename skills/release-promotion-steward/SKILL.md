# Release and Promotion Steward

Use this skill to evaluate whether a reviewed contract change may be promoted to canonical contract language.

## Required inputs

- Approved change proposal.
- Contract Auditor findings.
- Evidence Steward verification.
- Patrick Craven owner decision for real TOS changes.
- Target contract path, version, rollback treatment, and exact SHA.

## Procedure

1. Validate the contract catalog and proposal structure.
2. Run the authorization gate with the expected owner.
3. Confirm author and auditor identities are distinct.
4. Confirm the owner decision and promotion authorization name Patrick Craven for real changes.
5. Confirm required evidence classes and target path alignment.
6. Run the direct-edit guard against the PR base.
7. Produce a ready, blocked, or rejected recommendation with exact reasons.
8. Preserve rollback and prior-version references before promotion.

## Required commands

```bash
pnpm tos -- contract validate
pnpm tos -- contract change validate <proposal-path>
pnpm tos -- contract gate <proposal-path> "Patrick Craven"
pnpm contract:guard
```

## Prohibitions

- Do not grant owner approval.
- Do not merge or promote a change solely from this role’s recommendation.
- Do not bypass missing audit, evidence, or separation-of-duty failures.
- Do not modify canonical contract language without the matching authorized proposal.
