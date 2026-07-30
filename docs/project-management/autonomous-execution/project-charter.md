# Project Charter — TOS 0.3 Bounded Autonomous Execution

## Document control

| Field | Value |
|---|---|
| Project | TOS 0.3 — Bounded Autonomous Execution |
| Organization | Top Shelf Service LLC |
| Sponsor / Owner | Patrick Craven |
| Acting Project Manager | Patrick Craven |
| Proposed start | 2026-08-03 |
| Proposed finish | 2026-10-02 |
| Baseline date | 2026-07-30 |
| Starting repository commit | `f253d6bee4dd53c2fc3cd2900d9a5f92217da40f` |
| Charter status | Proposed — sponsor approval required |

## 1. Business need

TOS already provides machine-readable contracts, canonical truth, reconciliation, requirement traceability, repository inspection, owner-authorized boot decisions, evidence controls, and promotion gates. It does not yet perform autonomous work.

The project will create a bounded autonomous-execution capability that can plan, implement, test, repair, independently verify, and promote qualifying low-risk repository work without surrendering owner control over material risk, spending, legal authority, secrets, destructive changes, or production promotion.

The work also serves as a professional project-management exercise. Project artifacts will be maintained as controlled deliverables rather than informal notes.

## 2. Project purpose

Design, implement, validate, pilot, and formally accept a lean autonomous-execution kernel for TOS that:

1. converts eligible canonical requirements into bounded work orders;
2. grants temporary, explicit file and tool authority;
3. executes work in Git isolation;
4. captures complete attributable evidence;
5. requires independent verification;
6. permits automatic merge only when policy allows;
7. stops and escalates when authority, evidence, risk, or retry limits are exceeded.

## 3. Measurable objectives

| Objective | Success measure |
|---|---|
| Deterministic planning | The same eligible requirement and baseline inputs produce the same valid work-order fields. |
| Scope enforcement | Unauthorized files, tools, commands, runtime, and change volume fail closed. |
| Separation of duties | A Worker cannot verify or promote its own submission. |
| Evidence integrity | Promotion requires complete evidence tied to the exact current head SHA. |
| Controlled repair | Failed verification returns to the Worker for no more than three attempts or 45 minutes. |
| Bounded promotion | Only qualifying trivial and low-risk changes may merge automatically. |
| Reserved authority | Production promotion, external spend, contract approval, secret rotation, destructive data change, and security-policy change always require Patrick Craven. |
| Operational stop | The kill switch prevents new claims, pushes, merges, and promotions. |
| Recoverability | Interrupted work resumes without duplicate claims, commits, or evidence records. |
| Pilot readiness | Representative low-risk work orders complete with no unresolved critical incident. |

## 4. High-level scope

### In scope

- formal project planning, controls, reporting, and closeout;
- `.tos/execution-policy.yaml` and bounded autonomy policy;
- canonical work-order, claim, submission, verification, promotion, and execution-event records;
- work-order eligibility and compilation;
- Git branch or worktree isolation;
- allowed-file and allowed-tool enforcement;
- bounded retries, timeout, stop, and resume;
- independent verification and exact-SHA evidence;
- low-risk automatic merge policy;
- rollback planning and rehearsal;
- controlled pilot, observation, retrospective, and accept/revise/hold decision;
- user, operator, and project-management documentation.

### Out of scope

- unrestricted or self-expanding agent authority;
- autonomous contract approval, legal approval, spending, secret rotation, destructive data changes, security-policy changes, or production promotion;
- Redis, Postgres, message brokers, event buses, distributed locks, or persistent agent-memory services without measured need;
- multi-project distributed scheduling;
- automatic resolution of material fact conflicts;
- replacing GitHub branch protection or independent human oversight for reserved decisions;
- production use before pilot acceptance.

## 5. Major deliverables

1. Approved project charter and integrated management plan.
2. Project controls workbook and reusable management forms.
3. Execution-policy schema, validator, and kill switch.
4. Work-order schema, eligibility rules, compiler, and CLI.
5. Claim and Git-isolation lifecycle.
6. File, tool, time, retry, and change-volume enforcement.
7. Submission and append-only evidence records.
8. Independent verification and bounded repair loop.
9. Promotion gate, low-risk automatic merge, and rollback path.
10. Controlled pilot report, lessons learned, acceptance, and handoff.

## 6. Milestones and stage gates

| Gate | Target | Required decision |
|---|---:|---|
| Gate 1 — Charter authorization | 2026-08-05 | Approve, revise, hold, or reject the project charter. |
| Gate 2 — Integrated baseline | 2026-08-14 | Approve scope, schedule, cost basis, RAID, RACI, quality, and change controls. |
| Gate 3 — Feature complete | 2026-09-04 | Confirm work-order and execution lifecycle is ready for independent verification. |
| Gate 4 — Pilot authorization | 2026-09-11 | Confirm technical, safety, evidence, rollback, and operating-readiness criteria. |
| Gate 5 — Acceptance and closeout | 2026-10-02 | Accept, conditionally accept, revise, hold, or terminate. |

Dates are proposed planning assumptions until Gate 1 and Gate 2 approval.

## 7. Initial resource and cost basis

The initial baseline assumes Patrick Craven acts as Sponsor, Owner, and Project Manager, supported by governed Planner, Worker, Verifier, Promoter, Contract Steward, and Security Reviewer responsibilities.

Planned effort is estimated in the controls workbook. Hourly rates and dollar budget are intentionally unapproved and blank. No external spending is authorized by this charter. Any paid tool, service, vendor, or additional labor requires an approved change request.

## 8. Assumptions

- GitHub and GitHub Actions remain available for source control and exact-SHA verification.
- Node.js 20 and 22 and pnpm 10.33.3 remain supported unless changed through formal control.
- File-based work orders and append-only records are sufficient for one active work order.
- Existing TOS 0.2 controls remain regression requirements.
- Patrick Craven remains available for reserved decisions and gate approvals.
- Initial pilot work can be selected from low-risk repository maintenance or documentation changes.

## 9. Constraints

- TOS must remain lean; new infrastructure requires evidence of a real limitation.
- Maximum one active autonomous work order during the first release and pilot.
- Automatic merge is limited to qualifying trivial and low-risk work.
- The Worker may not verify itself or change its own authority.
- Exact-head CI, clean scope, evidence completeness, and rollback readiness are mandatory before promotion.
- Every material action must be attributable and append-only.

## 10. High-level risks

- authority or scope expansion;
- self-verification or self-promotion;
- repeated repair loops and uncontrolled compute usage;
- evidence SHA drift;
- ignored kill switch;
- secret or sensitive-data exposure;
- automatic merge without a valid rollback path;
- overengineering before measured need;
- inaccurate status or documentation drift.

The RAID log is the controlled detailed record.

## 11. Governance and authority

### Sponsor / Owner

Patrick Craven:

- authorizes the project and management baseline;
- owns reserved decisions and risk acceptance;
- approves material changes;
- authorizes the pilot;
- accepts or rejects the final project outcome.

### Project Manager

The Project Manager:

- integrates scope, schedule, cost, quality, resources, communications, stakeholders, risks, procurements, and changes;
- maintains the project controls and status forecast;
- prepares stage-gate decisions;
- does not replace technical verification or sponsor approval.

### Agent responsibilities

- **Planner:** compiles eligible requirements into bounded work orders.
- **Worker:** implements only the authorized work order.
- **Verifier:** independently reproduces and assesses the submission.
- **Promoter:** merges only when every promotion condition is satisfied.

No role may silently increase its own authority or collapse required separation of duties.

## 12. Project Manager authority

Upon charter approval, the Project Manager is authorized to:

- maintain project-management artifacts and working baselines;
- convene reviews and request evidence;
- assign planned work within approved scope;
- recommend corrective action, changes, escalation, hold, or termination;
- stop work when critical safety, authority, evidence, or quality controls fail.

The Project Manager is not authorized to approve reserved actions on behalf of the Sponsor.

## 13. Approval

| Decision | Selection |
|---|---|
| Approve | ☐ |
| Approve with conditions | ☐ |
| Revise and resubmit | ☐ |
| Hold | ☐ |
| Reject | ☐ |

**Conditions or comments:**  
`{{ENTER CONDITIONS OR COMMENTS}}`

**Sponsor / Owner:** Patrick Craven  
**Signature / recorded approval:** `{{ENTER APPROVAL RECORD}}`  
**Date:** `{{YYYY-MM-DD}}`
