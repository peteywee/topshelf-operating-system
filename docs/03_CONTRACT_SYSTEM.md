# Contract System

The package defines 105 foundation contracts. A contract is not merely documentation. It is a versioned, owned, testable control containing obligations, permissions, prohibitions, failure behavior, validation, evidence, and exit rules.

## Common envelope

Every contract includes identity, applicability, owner, approver, source of truth, purpose, scope, terms, inputs, outputs, preconditions, invariants, postconditions, permissions, prohibitions, failure behavior, acceptance criteria, validation, negative controls, evidence, change control, compatibility, deprecation, and retirement.

## Applicability rule

- `required`: must be instantiated now.
- `conditional`: must be instantiated when its trigger is true or unresolved with material risk.
- `not_applicable`: must contain a reason, authority, and review trigger.

A missing contract is a validation failure, not an implicit `not_applicable` determination.
