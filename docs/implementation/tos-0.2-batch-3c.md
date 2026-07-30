# TOS 0.2 — Batch 3C: Inspect and Boot

**Status:** validated; pending PR #11 merge  
**Branch:** `agent/tos-0-2-batch-3c-inspect-boot`  
**Base:** Batch 3B closeout `d0fd9c2c038d6f330cebf1d12cdc32db736a0b51`  
**Owner:** Patrick Craven

## Goal

Convert repository evidence, unresolved intake, module applicability, canonical truth, requirements, and reserved authority into one lean agent-ready boot packet without adding a package, database, daemon, scheduler, or autonomous runtime.

## Lean architecture

- `packages/kernel/src/inspect.ts` derives repository findings, module recommendations, and unresolved questions.
- `packages/kernel/src/boot.ts` validates the owner-approved `.tos/boot.yaml` record against current inspection, truth, requirements, and project authority.
- `.tos/boot.yaml` stores references and owner decisions, not copied facts or requirements.
- Existing YAML and Git history remain the persistence and audit mechanisms.
- No command writes canonical state automatically.

## Commands

```bash
tos inspect [as-of-date]
tos intake [as-of-date]
tos boot show [as-of-date]
tos boot validate [as-of-date]
```

## Safety boundary

The boot validator rejects:

- missing or downgraded inspection-required modules;
- owner drift;
- missing reserved actions;
- invalid requirements;
- unresolved material truth conflicts;
- blocking intake questions;
- autonomous Planner, Worker, Verifier, or Promoter modes before the execution kernel exists.

Nonblocking intake questions remain visible and may constrain later work orders, but they do not force the entire repository into an unusable state.

## Acceptance status

All twelve acceptance criteria passed at implementation SHA `31225678ad8d7d829c5d662d27db20250ad7706b` in Actions run `30576212673` on Node.js 20 and 22:

1. Repository evidence was inspected for package manager, runtime, workspace, TypeScript, CI, contract, canonical-state, agent, UI, auth, data, payment, and hosting signals.
2. Unresolved intake questions were emitted only for concerns not proven by repository evidence.
3. Module recommendations were deterministic and evidence-backed.
4. `.tos/boot.yaml` remained reference-based and did not copy facts or requirements.
5. Every inspection recommendation had an owner-reviewed module decision.
6. Required-module downgrade, owner drift, and premature-autonomy negative controls passed.
7. Merge, production promotion, external spend, and contract approval remained reserved.
8. Invalid requirements, material truth conflicts, and blocking intake were enforced as boot blockers.
9. `.tos/requirements.yaml` and `.tos/boot.yaml` were enforced as required canonical records.
10. Planner, Worker, Verifier, and Promoter remained human-assisted.
11. Frozen-lockfile installation and strict build, typecheck, and tests passed.
12. Every prior truth, requirement, contract, authorization, and direct-edit control remained green.

Canonical evidence is `TOS-EVD-008`; `TOS-BLK-007` is closed and `inspect-boot` is active.

## Explicitly out of scope

- interactive graphical intake;
- external repository adapters;
- autonomous execution;
- task scheduling or leases;
- persistent memory, database, cache, event bus, or background service;
- automatic edits to `.tos/`;
- automatic business-policy decisions.

## Definition of done

The implementation, exact-SHA validation, canonical evidence, blocker closure, and module activation are complete. Batch 3C reaches full done when PR #11 merges and post-merge state is reconciled.
