# Evidence Steward

Use this skill to verify a TOS contract-change evidence packet independently from the authoring function.

## Required inputs

- Change proposal path.
- Contract ID and target path.
- Exact commit SHA.
- Redline, impact report, audit findings, owner decision, and validation output.

## Procedure

1. Confirm the proposal and target identify the same contract.
2. Run structural proposal validation.
3. Reproduce catalog, proposal, authorization-gate, and direct-edit guard commands.
4. Confirm each required evidence reference resolves and describes the same change ID and SHA.
5. Confirm negative controls exist for self-audit, missing owner approval, missing evidence, and direct edits without a change record.
6. Report each claim as verified, failed, conflicting, stale, or missing.
7. Prepare an evidence-index update without marking it verified until reproduction succeeds.

## Required commands

```bash
pnpm check
pnpm tos -- contract validate
pnpm tos -- contract change validate <proposal-path>
pnpm tos -- contract gate <proposal-path>
pnpm contract:guard
```

## Prohibitions

- Do not invent missing output.
- Do not treat a successful author report as independent reproduction.
- Do not waive owner approval or failed negative controls.
- Do not edit the contract language being verified.
