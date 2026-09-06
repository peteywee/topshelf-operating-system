# Contract System

The package defines 105 foundation contracts. A contract is not merely documentation. It is a versioned, owned, testable control containing obligations, permissions, prohibitions, failure behavior, validation, evidence, and exit rules.

## Common envelope

Every contract includes identity, applicability, owner, approver, source of truth, purpose, scope, terms, inputs, outputs, preconditions, invariants, postconditions, permissions, prohibitions, failure behavior, acceptance criteria, validation, negative controls, evidence, change control, compatibility, deprecation, and retirement.

A contract that uses an architecture-critical term MUST use the controlled definition in `docs/01_OFFICIAL_IDENTITY_AND_NAMING.md` or explicitly state a narrower compatible definition. Silent redefinition is a contract defect.

## Cross-contract constitutional rules

The following rules apply even when a domain contract does not repeat them verbatim:

1. **Credential is not authority.** Access reachability cannot substitute for a capability grant.
2. **Privileged execution is bounded.** TOS-managed protected mutation must identify capability, target/scope, authority source, stop/failure behavior, evidence, and verification.
3. **Kernel mediation is non-bypassable once implemented/proven.** AI agents, modules, runtime services, adapters, workloads, and tool wrappers may not route TOS-managed privileged mutation around required execution-kernel admission.
4. **Read-only observation is distinct from mutation.** Observation may use a simpler path when policy permits; its existence never grants write authority.
5. **UNKNOWN is first-class.** Missing or contradictory evidence cannot be converted to PASS for convenience.
6. **Evidence is additive.** Repair, recovery, retry, supersession, and human override do not erase the original observation/failure/denial.
7. **Exact-candidate evidence is scoped.** Candidate evidence proves only the exact candidate/action identified.
8. **TSAL/TOS/workload versions are independent.** Detection of a newer standard is not silent adoption.
9. **Workloads remain independently safe.** TOS/TSAL loss cannot expand workload authority or disable approved fail-closed controls.
10. **Implementation truth is explicit.** A target architecture control must not be documented as implemented/proven before corresponding code and evidence exist.

## Authority-sensitive contract set

At minimum, the following templates must remain mutually consistent with the governing kernel boundary:

- `TOS-CTR-002` Constitutional Principles;
- `TOS-CTR-003` Naming and Terminology;
- `TOS-CTR-004` Authority and Approval;
- `TOS-CTR-023` Agent Work Order;
- `TOS-CTR-033` System Architecture;
- `TOS-CTR-047` Provider Adapter;
- `TOS-CTR-063` Authorization Capability;
- `TOS-CTR-096` Human Override.

A change that weakens one of these controls requires impact review across the others rather than treating the file as an isolated template edit.

## Applicability rule

- `required`: must be instantiated now.
- `conditional`: must be instantiated when its trigger is true or unresolved with material risk.
- `not_applicable`: must contain a reason, authority, and review trigger.

A missing contract is a validation failure, not an implicit `not_applicable` determination.

## Negative-control rule

A material contract must identify at least one deliberate violation that proves its denial/failure behavior when mechanically testable. For privileged authority boundaries, tests should include missing grant, reserved action, scope expansion, alternate-path bypass, stale/UNKNOWN state, and evidence-integrity failure as applicable.
