# TOS 0.3 Bounded Autonomous Execution — Project Package

**Organization:** Top Shelf Service LLC  
**Sponsor / Owner:** Patrick Craven  
**Acting Project Manager:** Patrick Craven  
**Planning baseline date:** 2026-07-30  
**Repository starting point:** `f253d6bee4dd53c2fc3cd2900d9a5f92217da40f`

## Purpose

This directory contains the repo-native source baseline for formally managing the TOS bounded autonomous-execution project. It separates project authorization and management controls from the technical implementation that will follow in TOS 0.3.

The current starting point has contract, truth, requirement, inspection, boot, evidence, authorization, and direct-edit controls. It does **not** yet have autonomous Planner, Worker, Verifier, or Promoter execution.

## Package contents

- [`project-charter.md`](project-charter.md) — why the project exists, scope, authority, objectives, success measures, assumptions, and approval.
- [`integrated-project-management-plan.md`](integrated-project-management-plan.md) — scope, schedule, cost, quality, resources, communications, stakeholders, risk, change, pilot, acceptance, and closeout controls.
- [`project-artifact-register.csv`](project-artifact-register.csv) — artifact ownership, status, cadence, and approval controls.
- [`forms/`](forms/) — reusable project status, change, gate, and closeout forms.
- [`visuals/`](visuals/) — editable Mermaid source for lifecycle, governance, WBS, authority, and schedule visuals.

## Baseline schedule assumption

| Phase | Proposed dates | Decision output |
|---|---|---|
| Initiation | 2026-08-03 to 2026-08-07 | Charter authorization |
| Detailed planning | 2026-08-10 to 2026-08-14 | Integrated baseline approval |
| Kernel build | 2026-08-17 to 2026-08-28 | Work-order and policy foundation |
| Execution and verification | 2026-08-24 to 2026-09-11 | Claims, isolation, verification, promotion controls |
| Pilot and hardening | 2026-09-14 to 2026-09-25 | Controlled autonomy and rollback evidence |
| Closeout | 2026-09-28 to 2026-10-02 | Acceptance, handoff, archive, lessons |

These dates are planning assumptions until approved at Gate 1 and Gate 2.

## Proposed autonomy boundary

- Maximum one active work order.
- Automatic merge only for qualifying trivial and low-risk work.
- Independent verification and exact-head CI required.
- Maximum three repair attempts and 45 minutes per work order.
- Kill switch checked before claims, pushes, merges, and promotions.
- Production promotion, external spending, contract approval, secret rotation, destructive data change, and security-policy change remain reserved to Patrick Craven.

## Working rules

1. Do not treat this plan as proof that the runtime exists.
2. Control material baseline changes with a change request and decision record.
3. Keep technical evidence tied to exact subjects and commit SHAs.
4. Do not mark deliverables accepted solely because implementation tasks are complete.
5. Update project status, forecast, RAID, decisions, and evidence without rewriting history.
