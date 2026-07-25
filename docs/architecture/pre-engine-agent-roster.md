# Pre-Engine Agnostic Agent Roster

**Status:** governed design baseline  
**Applies before:** autonomous agent runtime, scheduler, or work-lease engine  
**Owner:** Patrick Craven

## Governing principle

Agent authority must be designed before agent execution. Each role below may exist first as a reusable specification, skill, checklist, or human-assisted workflow. No role becomes autonomous merely because its files exist.

Every agent must have:

1. A single accountable mission.
2. Explicit owned and excluded outcomes.
3. Named inputs and outputs.
4. Tool and data permissions.
5. Required evidence and negative controls.
6. Independent review when the agent changes its own governing domain.
7. Human override and promotion authority.

## Required agnostic roles

| Priority | Role | Owns | Must not own | Earliest executable batch |
|---|---|---|---|---|
| 1 | Contract Steward | Contract drafting, controlled revisions, version proposals, register updates, redlines | Approval or audit of its own changes | 2 |
| 2 | Contract Auditor | Independent structural and semantic review of contract changes | Authoring the change it audits | 2 |
| 3 | Truth Steward | Fact provenance, freshness, conflicts, and source-of-truth reconciliation | Approving business policy from facts | 3 |
| 4 | Requirements Steward | Requirements, acceptance criteria, traceability, and definition of done | Declaring evidence passed without verification | 3 |
| 5 | Evidence Steward | Evidence capture rules, indexes, hashes, retention, and claim-to-proof links | Implementing the work it certifies | 4 |
| 6 | Security and Privacy Steward | Threat, data, identity, permission, secret, and privacy controls | Product scope or commercial approval | 4 |
| 7 | Release and Promotion Steward | Version, gate, rollback, recovery, and environment promotion decisions | Bypassing failed gates | 5 |
| 8 | Knowledge Steward | Terminology, architecture records, user and technical documentation, onboarding | Changing implementation truth without evidence | 5 |
| 9 | Workflow Coordinator | Task decomposition, dependencies, handoffs, leases, retries, and escalation | Self-approving task completion | Engine-adjacent |
| 10 | Integration Steward | Provider, adapter, API, event, and external dependency contracts | Granting unrestricted provider access | Provider-adapter batch |

## Separation-of-duty pairs

The following roles must remain separate even if one human or model temporarily performs both functions in a non-production workflow:

- Contract Steward and Contract Auditor.
- Implementer and Evidence Steward.
- Security control author and security control verifier.
- Release candidate producer and Release and Promotion Steward.
- Workflow Coordinator and final owner approval.

When one operator performs both sides during early development, the record must state that independence was unavailable and owner review is mandatory.

## Batch 2 boundary

Batch 2 implements the Contract Steward and Contract Auditor as governed specifications and reusable skills, plus executable contract catalog loading and validation. It does not implement autonomous invocation, scheduling, persistent memory, or tool execution.

The remaining roles are defined here now to prevent later authority overlap, but their executable behavior belongs to later batches.