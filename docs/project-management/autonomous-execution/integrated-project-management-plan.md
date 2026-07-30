# Integrated Project Management Plan — TOS 0.3 Bounded Autonomous Execution

## 1. Plan purpose and control

This plan defines how the project will be planned, executed, monitored, controlled, accepted, transitioned, and closed. It supports the Project Charter and is subordinate to approved TOS contracts, canonical state, owner authority, and applicable security and legal requirements.

The proposed baseline is dated 2026-07-30. Schedule, effort, and operating-policy values remain planning assumptions until approved through Gate 1 and Gate 2.

## 2. Lifecycle and governance approach

The project uses a gated hybrid lifecycle:

1. **Initiation** — authorize the project and identify stakeholders.
2. **Planning** — baseline scope, WBS, schedule, cost basis, quality, resources, communications, risk, procurement, change control, acceptance, and pilot criteria.
3. **Build** — implement bounded work-order and execution controls in reviewable increments.
4. **Verification** — independently validate behavior, scope enforcement, evidence, safety, and regression protection.
5. **Pilot** — operate representative low-risk work under observation.
6. **Closeout** — obtain acceptance, transition ownership, archive records, and capture lessons.

A gate decision may approve, approve with conditions, revise, hold, or terminate the project or phase.

## 3. Scope management plan

### Scope baseline

The scope baseline consists of:

- the approved charter;
- the approved scope statement;
- the WBS and WBS descriptions;
- the requirements traceability matrix;
- approved changes.

### Scope verification

A deliverable is not accepted merely because implementation is complete. Acceptance requires:

- traceability to an approved requirement and work package;
- satisfaction of acceptance criteria;
- required evidence;
- independent verification where specified;
- acceptance by the named authority.

### Scope control

Any proposal that changes project objectives, deliverables, protected authority, automatic-merge eligibility, schedule baseline, external cost, pilot criteria, or acceptance criteria requires integrated change control.

The following are presumed material changes:

- adding a database, queue, daemon, distributed scheduler, or persistent memory service;
- increasing concurrency above one active work order;
- permitting medium- or high-risk automatic merge;
- removing independent verification or exact-SHA evidence;
- expanding autonomous access to secrets, production, spending, contracts, or destructive data changes;
- weakening the kill switch, retries, timeout, rollback, or protected-path controls.

## 4. Work breakdown structure

| WBS | Work package | Primary output |
|---|---|---|
| 1.0 | Project management | Approved baselines, controls, status, changes, gate records, and closeout |
| 2.0 | Governance and execution policy | Risk classes, reserved authority, policy validator, and kill switch |
| 3.0 | Work-order compiler | Schema, eligibility rules, deterministic compiler, and CLI |
| 4.0 | Execution lifecycle | Claims, Git isolation, file/tool scope, stop, timeout, and resume |
| 5.0 | Independent verification and evidence | Submission records, independent verifier, and bounded repair |
| 6.0 | Promotion, rollback, and pilot | Promotion gate, low-risk merge, rollback, controlled pilot, and decision |

The detailed WBS and activity-level schedule are maintained in `TOS_Autonomous_Execution_Project_Controls.xlsx` and may be mirrored into issue or project-board tasks after baseline approval.

## 5. Schedule management plan

### Proposed baseline

| Phase | Start | Finish | Primary exit condition |
|---|---:|---:|---|
| Initiation | 2026-08-03 | 2026-08-07 | Gate 1 charter authorization |
| Detailed planning | 2026-08-10 | 2026-08-14 | Gate 2 integrated baseline approval |
| Kernel build | 2026-08-17 | 2026-08-28 | Policy and work-order foundation complete |
| Execution and verification | 2026-08-24 | 2026-09-11 | Independent verification and promotion controls complete |
| Pilot and hardening | 2026-09-14 | 2026-09-25 | Pilot evidence and scale/revise/hold decision prepared |
| Closeout | 2026-09-28 | 2026-10-02 | Gate 5 acceptance, handoff, archive, and lessons |

### Schedule control

The Project Manager updates actual dates, remaining duration, dependencies, and forecast at least weekly. Schedule variance is escalated when:

- a gate is forecast more than five business days late;
- a critical-path task is blocked without an approved recovery plan;
- a dependency threatens pilot or acceptance;
- corrective action would change scope, cost, risk, or acceptance criteria.

Dates are changed through forecast updates; baseline dates change only through approved change control.

## 6. Cost and resource management plan

### Cost basis

The initial cost baseline uses planned labor hours by responsibility. Hourly rates and dollar values are intentionally blank until Patrick Craven approves an internal planning rate or organizational cost model.

No external spending is authorized. Paid tools, providers, contractors, infrastructure, or licenses require:

1. documented business need;
2. options and total-cost comparison;
3. security and contract review where applicable;
4. approved change request;
5. Patrick Craven approval.

### Initial effort categories

- project management and controls;
- architecture and planning;
- implementation;
- independent verification;
- security/privacy review;
- documentation and training;
- contingency.

Actual hours and cost-to-complete are updated weekly when work begins.

## 7. Quality management plan

Quality is defined as conformance to approved requirements, policy, authority, evidence, and acceptance criteria—not merely working code.

### Quality objectives

- deterministic work-order generation;
- strict least-authority enforcement;
- no Worker self-verification;
- complete attributable evidence;
- exact-head CI before promotion;
- bounded retries and runtime;
- immediate kill-switch enforcement;
- tested rollback before autonomous merge;
- no regression of existing TOS contract, truth, requirement, boot, evidence, or authorization controls.

### Verification methods

- schema validation;
- strict TypeScript build and typecheck;
- unit tests;
- integration tests;
- adversarial and negative controls;
- CLI smoke tests;
- exact-SHA GitHub Actions evidence on Node.js 20 and 22;
- diff and scope inspection;
- rollback rehearsal;
- controlled pilot observation.

### Defect handling

A failed criterion is recorded as a defect, issue, blocker, or rejected submission. Tests may not be disabled, weakened, or reclassified solely to obtain a passing result.

## 8. Resource and responsibility plan

### Core roles

- **Sponsor / Owner — Patrick Craven:** authorization, reserved decisions, risk acceptance, pilot authorization, final acceptance.
- **Project Manager:** integration, controls, forecasts, communications, changes, gates, acceptance preparation, closeout.
- **Planner:** requirement eligibility, bounded work-order compilation, scope and evidence definition.
- **Worker:** bounded implementation, test execution, submission, and repair.
- **Verifier:** independent scope, evidence, quality, security-trigger, and exact-SHA verification.
- **Promoter:** promotion eligibility, merge, rollback readiness, and escalation.
- **Contract Steward:** controlled contract interpretation and change workflow.
- **Security / Privacy Reviewer:** secrets, data classification, permissions, protected paths, and security-policy triggers.

### Separation of duties

- A Worker may not verify its own submission.
- A Planner may not silently approve its own scope expansion.
- A Promoter may not bypass failed or incomplete verification.
- Any role affected by a material conflict of interest must escalate.
- Patrick Craven remains the final authority for reserved actions.

The detailed RACI is maintained in the controls workbook.

## 9. Communications management plan

| Communication | Audience | Owner | Cadence | Output |
|---|---|---|---|---|
| Working update | Project team / agents | Project Manager | As material findings occur | Current facts, blockers, and next action |
| Weekly project status | Sponsor and stakeholders | Project Manager | Weekly | Health, accomplishments, forecast, risks, decisions, and change status |
| RAID review | Owners of open items | Project Manager | Weekly and on critical trigger | Updated response, owner, due date, and residual risk |
| Design / policy review | Planner, Verifier, Security Reviewer, Owner | Project Manager | At design baseline and material change | Approved or revised control design |
| Gate review | Sponsor and required reviewers | Project Manager | At each gate | Decision record and conditions |
| Incident escalation | Sponsor and affected authority | Discovering role | Immediately for critical conditions | Stop record, facts, containment, impact, and decision needed |
| Pilot observation brief | Sponsor and pilot reviewers | Project Manager | During pilot | Metrics, failures, interventions, and emerging lessons |
| Closeout report | Sponsor and future operators | Project Manager | Project end | Acceptance, residual work, handoff, archive, and lessons |

Status statements must distinguish verified results, reported results, assumptions, forecasts, and unresolved conflicts.

## 10. Stakeholder engagement plan

Stakeholders are assessed by influence, impact, current engagement, desired engagement, and communication need. The Sponsor and Project Manager remain leading participants. Planner, Verifier, Promoter, Security Reviewer, and future adopting project owners are engaged at the points where their authority or evidence is required.

Unresolved business questions identified by repository inspection remain visible and are not silently answered by technical implementation.

## 11. Risk management plan

### Scoring

Probability and impact use a 1–5 scale. Exposure is probability × impact.

| Score | Priority | Response expectation |
|---:|---|---|
| 1–4 | Low | Monitor or accept with rationale |
| 5–9 | Medium | Assign response and review regularly |
| 10–16 | High | Active mitigation, owner, due date, and residual-risk assessment |
| 17–25 | Critical | Stop or escalate until an authorized disposition exists |

### Principal risk themes

- authority and scope expansion;
- self-verification or self-promotion;
- infinite repair loops or uncontrolled compute use;
- evidence SHA drift;
- kill-switch failure;
- secret or sensitive-data exposure;
- rollback failure;
- overengineering;
- status or documentation drift;
- dependency on GitHub Actions availability.

The RAID log is reviewed weekly and immediately when a critical trigger occurs. Closed items retain history.

## 12. Change and configuration management plan

### Change process

1. Submit a change request.
2. Analyze scope, schedule, cost, quality, resource, security, contract, risk, and acceptance impacts.
3. Recommend approve, approve with conditions, reject, defer, or request more information.
4. Obtain the required authority decision.
5. Update affected baselines and traceability only after approval.
6. Implement and verify the approved change.
7. Record closure and residual effects.

### Configuration control

- Git is the configuration and audit mechanism.
- Protected project and policy records require reviewable branches and PRs.
- Evidence identifies exact subjects and commit SHAs.
- Append-only logs are not rewritten to conceal prior state.
- Release tags are created only for accepted milestones.
- Generated Office/PDF packages are derived outputs; Markdown, CSV, YAML, source files, and approved decisions remain authoritative.

## 13. Security, privacy, legal, and procurement plan

The first autonomous release receives no general secret access and no authority to approve contracts, legal terms, spending, destructive data changes, security-policy changes, or production promotion.

Security/privacy review is triggered by changes involving:

- authentication or authorization;
- credentials, tokens, keys, or secret stores;
- personal, financial, protected, or client data;
- network, deployment, or infrastructure policy;
- dependency or supply-chain risk;
- logging that may expose sensitive information;
- code execution or shell access expansion.

Contract changes continue through the controlled Contract Steward, independent audit, evidence, promotion, and Patrick Craven approval chain.

## 14. Autonomous execution safety plan

### Proposed initial mode

`bounded_autonomous`

### Proposed limits

- maximum active work orders: 1;
- automatic merge risk: trivial and low only;
- maximum repair attempts: 3;
- maximum runtime: 45 minutes per work order;
- maximum changed files: 20;
- maximum changed lines: 1,000 unless an approved work order sets a lower limit;
- exact-head CI: required;
- independent verification: required;
- clean scope: required;
- rollback plan: required before automatic merge.

### Reserved actions

Patrick Craven approval remains required for:

- production promotion;
- external spending;
- contract or legal approval;
- secret rotation or disclosure;
- destructive data changes;
- security-policy changes;
- changes to the execution policy or autonomous kernel that would increase authority;
- protected-path or risk classes defined by the approved policy.

### Kill switch

`.tos/AUTONOMY_DISABLED` is the proposed repository kill switch. It must be checked before every claim, push, merge, and promotion. Activation stops new material autonomous actions and records the stop reason.

## 15. Pilot management plan

The pilot is a controlled operational validation, not a demonstration-only exercise.

### Entry criteria

- Gate 4 approval;
- all critical technical and safety controls verified;
- exact-SHA CI green;
- rollback rehearsed;
- pilot work orders selected and risk-classified;
- observation roles and stop criteria assigned;
- evidence and incident templates ready.

### Pilot design

Use representative trivial and low-risk repository tasks such as documentation consistency, narrowly scoped validation improvements, or low-risk maintenance. Do not use production promotion, secrets, payments, contracts, destructive data, or high-risk security changes.

### Pilot observations

Track:

- work-order compilation quality;
- scope violations;
- retries and repair causes;
- elapsed time and human interventions;
- verification failures;
- evidence completeness;
- rollback readiness;
- merge outcomes;
- operator understanding;
- incidents and near misses.

### Exit decision

At pilot end, Patrick Craven decides to:

- accept and proceed;
- accept with conditions;
- revise and repeat pilot;
- hold;
- terminate or pivot.

## 16. Deliverable acceptance and definition of done

The project is complete only when:

1. approved requirements and changes are traceable to delivered and verified outputs;
2. work-order compilation is deterministic;
3. invalid or disputed requirements cannot execute;
4. file, tool, authority, runtime, retry, and change-volume limits fail closed;
5. duplicate claims are prevented;
6. interrupted work resumes safely;
7. the Worker cannot verify itself;
8. failed verification produces bounded repair or escalation;
9. exact-head CI is required before promotion;
10. trivial and low-risk qualifying work can merge autonomously;
11. reserved and protected work stops and escalates;
12. the kill switch prevents new material actions;
13. rollback is defined and proven;
14. every material action is attributable and append-only;
15. existing TOS controls remain green on Node.js 20 and 22;
16. the controlled pilot is completed and accepted;
17. operating documentation, forms, handoff, archive, and lessons are complete;
18. Patrick Craven records final acceptance.

## 17. Transition and closeout plan

Closeout includes:

- final deliverable acceptance;
- residual-risk and open-work disposition;
- operational ownership and runbook handoff;
- support and kill-switch responsibilities;
- final schedule and effort results;
- configuration and evidence archive;
- branch, issue, and PR cleanup;
- release/tag decision;
- lessons-learned review;
- final project closeout report.

Incomplete or deferred work is assigned an owner, target, and authority; it is not hidden inside a “complete” status.

## 18. Project Manager operating cadence

### Daily or per work session

- review canonical facts, blockers, claims, and active work;
- confirm authority and kill-switch status;
- record material findings, decisions, and escalations;
- protect the current baseline from uncontrolled change.

### Weekly

- update schedule actuals and forecast;
- update RAID owners, responses, due dates, and residual risk;
- update requirement and quality status;
- reconcile decisions and changes;
- update actual effort and estimate to complete;
- prepare sponsor status and decisions needed.

### At every gate

- confirm entry criteria;
- assemble exact evidence;
- document open risks and conditions;
- obtain an explicit decision;
- update the baseline and activity records accordingly.

## 19. Baseline approval

| Plan element | Status | Approval record |
|---|---|---|
| Scope and WBS | Proposed | `{{ENTER DECISION}}` |
| Schedule | Proposed | `{{ENTER DECISION}}` |
| Cost basis | Proposed | `{{ENTER DECISION}}` |
| Quality and acceptance | Proposed | `{{ENTER DECISION}}` |
| Resources and RACI | Proposed | `{{ENTER DECISION}}` |
| Communications and stakeholders | Proposed | `{{ENTER DECISION}}` |
| RAID and responses | Proposed | `{{ENTER DECISION}}` |
| Change and configuration control | Proposed | `{{ENTER DECISION}}` |
| Autonomous execution policy | Proposed | `{{ENTER DECISION}}` |
| Pilot and closeout | Proposed | `{{ENTER DECISION}}` |

**Sponsor / Owner:** Patrick Craven  
**Gate 2 decision:** `{{APPROVE / APPROVE WITH CONDITIONS / REVISE / HOLD / REJECT}}`  
**Date:** `{{YYYY-MM-DD}}`
