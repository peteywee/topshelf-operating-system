# TSAL / TOS / Workload Architecture Boundary

**Status:** governing architecture invariant

This document defines the responsibility boundary the TopShelf automation stack is built around. Future implementation work MUST preserve this direction unless Patrick explicitly approves a superseding governing decision with migration and compatibility evidence.

## Canonical model

```text
                              OWNER
                    goals / authority / limits
                         │              ▲
                         ▼              │ escalate
                    ┌───────────────┐   │
                    │      TOS      │───┘
                    │ control plane │
                    └───────┬───────┘
                            │
              bounded operations / actions
                            ▼
             ┌──────────────┼──────────────┐
             ▼              ▼              ▼
          XQueue          Teach          future
          workload        workload       workloads
             │              │              │
             └──────────────┼──────────────┘
                            │
             facts / evidence / outcomes
                            │
                            └──────────────► TOS

              TOS ── consult/evaluate ──► TSAL
                                          rules
                                          contracts
                                          schemas
                                          proof semantics
```

This is a responsibility model, not a runtime call chain through TSAL. Workloads emit facts, evidence, outcomes, and declared bounded action surfaces for TOS. TOS evaluates those facts and proposed actions against TSAL-defined contracts, schemas, and proof semantics. TSAL is not a runtime sink, service dependency, or middleware between TOS and a workload.

## Constitutional responsibilities

### TSAL — define correctness

TSAL owns technology-agnostic automation rules and proof semantics:

- lifecycle;
- risk and authority classes;
- contracts;
- evidence semantics;
- conformance;
- compatibility expectations;
- incident/recovery semantics;
- deterministic policy that can be evaluated mechanically.

TSAL MUST remain usable without TOS and MUST NOT depend on TOS implementation details.

### TOS — operate within policy

TOS owns cross-project autonomous operations:

- observe project and provider state;
- detect changes and drift;
- evaluate TSAL and organization policy;
- classify whether a repair/action is safe and authorized;
- invoke declared bounded actions;
- independently verify outcomes;
- preserve evidence;
- escalate to the owner when certainty, authority, or repair policy is insufficient.

TOS MUST NOT infer authority from credentials alone, silently expand a workload contract, or rewrite evidence to manufacture a successful state.

### Workload — perform domain behavior safely

A workload such as XQueue or Teach owns its domain behavior and local safety controls:

- execute the domain job;
- maintain truthful durable state;
- fail closed on ambiguity;
- expose health/facts/evidence and outcomes for TOS or other authorized consumers;
- expose explicit bounded repair/action primitives where appropriate;
- remain independently safe if TOS or TSAL is unavailable.

A workload MUST NOT require a live TOS/TSAL service merely to preserve its already-approved safety properties.

## Dependency direction

Allowed:

```text
TOS -> TSAL interfaces/schemas
TOS -> workload interfaces / declared bounded actions
workload -> TSAL schemas/contracts
adapters -> TSAL interfaces
```

Forbidden:

```text
TSAL core -> TOS implementation
TSAL core -> workload implementation
workload runtime -> TOS as prerequisite for local safety
workload -> hidden cross-project policy
TOS -> undeclared provider/project mutation
```

## Version and adoption model

TSAL, TOS, and workload versions are independent release lines.

A new TSAL release does not automatically mutate every workload.

```text
new TSAL release
      │
      ▼
TOS / CI detects it
      │
      ▼
compatibility assessment
   ┌──┴───────────────┐
   │                  │
unaffected         adoption required
   │                  │
no workload        explicit workload candidate
change                │
                      ▼
                 tests + evidence + TSAL audit
                      │
                      ▼
                 workload release decision
```

Rules:

1. Detection MAY be automatic.
2. Compatibility assessment SHOULD become automatic where deterministic.
3. Adoption is not automatic merely because a newer TSAL version exists.
4. If adopting TSAL changes committed workload content, the workload becomes a new exact candidate and follows its own versioning/release policy.
5. A previously proven workload release remains immutable historical evidence.
6. Restoring already-approved runtime/provider state without changing repository content is an operational repair, not necessarily a software release.

## Automation endgame

The target operating loop is:

```text
observe
  ↓
diagnose / classify
  ↓
can policy prove a bounded safe repair?
  ├─ yes → execute repair → independently verify → continue
  └─ no  → fail closed → preserve evidence → alert owner with exact decision needed
```

The objective is **minimum human involvement, not minimum observation**.

Human observation should approach zero. System observation and evidence should approach complete coverage for material authority surfaces.

## Placement rule for future work

Use this decision tree before adding functionality:

```text
Is the workload broken?
  ├─ yes → fix the workload
  └─ no
      Is it a new domain/business capability?
        ├─ yes → workload
        └─ no
            Is it a reusable automation/governance rule?
              ├─ yes → TSAL
              └─ no → leave it alone

Does that reusable rule require autonomous cross-project action?
  ├─ yes → TOS implements the operation using TSAL interfaces
  └─ no → TSAL only
```

This is the anti-overengineering boundary: workloads stay boring; TSAL generalizes policy; TOS centralizes cross-project autonomous operation.

## Current reference sequence

```text
XQueue 1.1.0
  proven production workload
       ↓
TSAL
  extract and encode reusable rules/tooling
       ↓
TOS
  consume TSAL and operate workloads autonomously
       ↓
Teach + additional workloads
```

XQueue is a reference workload, not the place to build the general control plane. TOS bounded autonomous execution is itself another reference workflow and must follow the same authority/evidence model.

## Change control

Any future design that reverses these dependency directions, makes TSAL runtime middleware, makes workloads depend on TOS for local safety, or allows standards to silently mutate workloads is a **governing architecture change**, not an implementation detail.

Such a change requires an explicit superseding decision, documented compatibility impact, migration plan, negative tests, and exact-candidate evidence before adoption.
