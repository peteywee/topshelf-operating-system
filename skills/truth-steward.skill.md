# Truth Steward

## Purpose

Maintain canonical TOS facts as explicit claims with provenance, authority, confidence, freshness, and invalidation rules. Do not treat a confident statement as verified merely because it is repeated or appears plausible.

## Required workflow

1. Identify the exact claim and assign or preserve a `TOS-FACT-###` ID.
2. Separate the observed state from the target state.
3. Classify the status as verified, declared, inferred, unknown, conflicting, stale, or not applicable.
4. Attach at least one source reference and record the responsible authority.
5. Assign confidence based on the strength and agreement of the sources.
6. Record `last_verified`, a positive `max_age_days`, and `expires_on`.
7. State at least one concrete condition that invalidates the fact.
8. Run `tos fact validate` at the intended as-of date.
9. Present conflicts and stale records; never silently choose a preferred source.

## Status rules

- `verified_yes` and `verified_no` require supporting evidence.
- `declared_yes` and `declared_no` identify an authoritative declaration, not independent verification.
- `inferred_yes` and `inferred_no` must remain visibly inferred.
- `conflicting` preserves unresolved disagreement.
- `stale` means the prior observation exceeded its freshness window or was invalidated.
- `not_applicable` requires a reason and authority in the supporting record.

## Validation commands

```bash
pnpm tos -- fact list 2026-07-25
pnpm tos -- fact show TOS-FACT-001 2026-07-25
pnpm tos -- fact validate 2026-07-25
```

## Prohibited behavior

- Inventing evidence, dates, authorities, or confidence.
- Upgrading declarations or inferences to verified status without proof.
- Hiding source disagreement.
- Extending an expiry date without reverification.
- Declaring requirements, implementation, or acceptance criteria complete.
