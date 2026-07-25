# Pre-Engine Agnostic Agent Roster

**Status:** governed design baseline  
**Applies before:** autonomous agent runtime, scheduler, or work-lease engine  
**Owner:** Patrick Craven

## Governing principle

Agent authority must be designed before agent execution. Each role may exist first as a reusable specification, skill, checklist, or human-assisted workflow. No role becomes autonomous merely because its files exist.

Every agent must have a single accountable mission; explicit owned and excluded outcomes; named inputs and outputs; tool and data permissions; required evidence and negative controls; independent review when changing its own governing domain; and human override and promotion authority.

## Required agnostic roles

| Priority | Role | Current pre-engine state | Owns | Must not own |
|---|---|---|---|---|
| 1 | Contract Steward | Specified with skill and proposal commands | Contract drafting, controlled revisions, version proposals, redlines | Approval or audit of its own changes |
| 2 | Contract Auditor | Specified with skill and independent review boundary | Structural and semantic review of contract changes | Authoring the change it audits |
| 3 | Evidence Steward | Specified with skill in Batch 2C | Reproduction, evidence completeness, claim-to-proof links | Implementing or self-certifying the work it verifies |
| 4 | Release & Promotion Steward | Specified with skill and gate/guard commands in Batch 2C | Gate, target, rollback, and promotion-readiness evaluation | Owner approval or bypassing failed gates |
| 5 | Truth Steward | Specified with skill and fact validation commands in Batch 3A | Fact identity, provenance, confidence, freshness, conflicts, and invalidation rules | Approving policy, fabricating evidence, or silently resolving conflicts |
| 6 | Requirements Steward | Design baseline only | Requirements, acceptance criteria, traceability, and definition of done | Declaring evidence passed without verification |
| 7 | Security & Privacy Steward | Design baseline only | Threat, data, identity, permission, secret, and privacy controls | Product scope or commercial approval |
| 8 | Knowledge Steward | Design baseline only | Terminology, architecture records, documentation, and onboarding | Changing implementation truth without evidence |
| 9 | Workflow Coordinator | Design baseline only | Task decomposition, dependencies, handoffs, leases, retries, and escalation | Self-approving task completion |
| 10 | Integration Steward | Design baseline only | Provider, adapter, API, event, and external dependency contracts | Granting unrestricted provider access |

## Contract-governance chain

```text
Contract Steward
    → Contract Auditor
    → Evidence Steward
    → Release & Promotion Steward
    → Patrick Craven owner approval
```

The Steward authors. The Auditor reviews independently. The Evidence Steward reproduces proof. The Release & Promotion Steward evaluates the gate and target. Patrick remains the approval authority for real TOS contract promotion.

## Truth-governance boundary

The Truth Steward may classify a claim as verified, declared, inferred, conflicting, stale, unknown, or not applicable. It may propose additions and corrections to `.tos/facts.yaml`, but it cannot turn a disputed source into policy, extend freshness without reverification, or declare work complete.

## Separation-of-duty pairs

- Contract Steward and Contract Auditor.
- Implementer and Evidence Steward.
- Fact claimant and independent fact verifier when verification materially affects a promotion decision.
- Security control author and security control verifier.
- Release candidate producer and Release & Promotion Steward.
- Workflow Coordinator and final owner approval.

When one operator performs both sides during early development, the record must state that independence was unavailable; the result cannot satisfy a production independence gate without an additional independent reviewer.

## Current boundary

Batches 2A–2C specify contract governance and implement catalog, proposal, redline, impact, authorization, and direct-edit guard commands. Batch 3A specifies the Truth Steward and implements canonical fact validation. These roles remain human-assisted and do not implement autonomous invocation, scheduling, persistent memory, general tool execution, or automatic legal approval.

The remaining roles stay defined here to prevent later authority overlap. Their executable subsystems belong to future batches.
