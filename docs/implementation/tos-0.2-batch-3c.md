# TOS 0.2 — Batch 3C: Inspect and Boot

**Status:** implementation branch  
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

## Acceptance criteria

1. Inspection derives package manager, runtime, workspace, TypeScript, CI, contract, canonical-state, agent, UI, auth, data, payment, and hosting signals from repository evidence.
2. Inspection asks only questions that repository evidence did not resolve.
3. Module recommendations are deterministic and evidence-backed.
4. `.tos/boot.yaml` contains references rather than copied canonical payloads.
5. Every inspection recommendation has an owner-reviewed module decision.
6. Inspection-required modules cannot be downgraded.
7. Boot owner must match `.tos/project.yaml`.
8. Merge, production promotion, external spend, and contract approval remain reserved.
9. Agent roles remain human-assisted until an execution kernel is implemented.
10. Invalid requirements, material fact conflicts, or blocking intake prevent boot readiness.
11. `.tos/requirements.yaml` and `.tos/boot.yaml` are required canonical state records.
12. Node.js 20 and 22 pass the complete existing and new CI workflow.

## Explicitly out of scope

- interactive graphical intake;
- external repository adapters;
- autonomous execution;
- task scheduling or leases;
- persistent memory, database, cache, event bus, or background service;
- automatic edits to `.tos/`;
- automatic business-policy decisions.

## Definition of done

Batch 3C is complete only when the exact PR head passes the full Node.js 20/22 workflow, canonical evidence is verified, `TOS-BLK-007` is closed, the `inspect-boot` runtime module is active, and post-merge state is reconciled.
