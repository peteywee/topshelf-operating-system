# System Architecture

TOS consists of a deterministic kernel, executable runtime/system services, a control-plane/userland layer, versioned modules, provider/project adapters, canonical project state, and an owner authority layer.

TOS is the cross-project operating system and autonomous operator. TSAL defines provider-neutral automation rules and proof semantics that TOS consumes. Workloads such as XQueue and Teach remain independently safe domain systems; they are managed workloads, not processes that must live inside TOS.

Normative terminology is defined in `docs/01_OFFICIAL_IDENTITY_AND_NAMING.md`.

## Canonical responsibility model

```text
                               OWNER
                     goals / authority / limits
                          │             ▲
                          ▼             │ escalate
                 TOS CONTROL PLANE      │
             observe / diagnose / plan  │
                coordinate / propose ───┘
                    │             │
                    │ consult     │ privileged proposal
                    ▼             ▼
                  TSAL        TOS KERNEL
           rules/contracts/   deterministic
           proof semantics    admission/enforcement
                                  │
                     authorized bounded action
                                  ▼
                         ADAPTERS / DRIVERS
                          │              │
                          ▼              ▼
                     PROVIDERS       WORKLOADS
                                      XQueue / Teach
                          ▲              │
                          └──── facts / evidence /
                               outcomes / state
                                  │
                                  ▼
                         TOS CONTROL PLANE
```

This is a responsibility model, not a claim that TSAL is a live runtime service. TOS may load/version TSAL contracts and schemas locally. Workloads remain safe when TOS or TSAL is unavailable.

## Layer responsibilities

### Owner

The owner defines business intent, grants and reserves authority, accepts residual risk, approves governing architecture changes, and receives escalations that exceed automated certainty or authority.

### Control plane / userland

The control plane owns observation, diagnosis, planning, compatibility assessment, orchestration, scheduling, candidate construction, user interaction, and agent coordination.

Userland MAY be AI-assisted. It MAY recommend or propose a privileged action. It MUST NOT convert recommendation, credentials, tool reachability, or successful previous execution into authority.

Read-only observation MAY occur outside privileged kernel execution when the applicable contract permits it. Observation MUST NOT be treated as mutation authority.

### TOS kernel

The kernel is the deterministic trusted core. It owns or mediates the primitives that cannot be safely left to discretionary userland behavior:

- canonical policy and authority evaluation;
- controlled vocabulary and stable state-machine semantics;
- capability admission and reserved-action enforcement;
- exact-candidate/action identity binding where required;
- task leases, fencing, concurrency and duplicate-execution prevention for protected operations;
- mutation admission for TOS-managed privileged actions;
- repair-budget and stop-condition enforcement;
- evidence requirements and protected audit recording;
- verification/promotion prerequisites;
- fail-closed behavior when required authority, identity, state, or certainty is missing.

The kernel MUST be deterministic for any decision that can be expressed deterministically. AI MAY propose inputs or explain results but MUST NOT replace a deterministic kernel control with discretionary judgment.

The kernel MUST NOT infer authority from possession of a credential. It MUST NOT allow a caller, module, adapter, agent, or workload to self-grant a capability.

### Execution-kernel boundary

A **TOS-managed privileged action** MUST be mediated by the execution kernel before side effects occur.

A privileged action includes mutation of canonical TOS state or protected external/provider, production, public, financial, security/identity, release/promotion, or destructive state.

Kernel mediation requires, as applicable to risk and contract:

1. exact action/candidate identity;
2. declared capability and authority source;
3. target and scope;
4. preconditions and current truth state;
5. lease/fencing or concurrency guard;
6. bounded blast radius and repair/retry budget;
7. explicit stop/fail-closed conditions;
8. required evidence plan;
9. independent verification requirement;
10. escalation path when proof or authority is insufficient.

A component that can technically reach a provider MUST still route TOS-managed privileged mutation through this boundary. Direct mutation that bypasses required kernel admission is an architecture violation even if the provider accepts the request.

### Current implementation status

The repository already contains `@topshelf-os/kernel` for deterministic foundation behavior including truth, reconciliation, requirements, inspection, intake, and boot validation.

The privileged **execution-kernel** mediation capability is not yet complete. Current boot validation intentionally rejects autonomous agent roles until that execution kernel is implemented. Documentation MUST NOT claim autonomous privileged enforcement is production-ready before code and evidence prove it.

### Runtime/system services

Runtime services implement executable capabilities such as CLI handling, truth reconciliation, scheduling, work-order compilation, evidence management, promotion, recovery, upgrade, and lesson propagation.

A runtime service is not automatically trusted kernel code. Services that request privileged mutation are callers of the kernel boundary, not alternate authority sources.

### Modules

Modules provide versioned TOS capabilities selected from project facts. Modules MAY extend userland behavior or provide deterministic components, but activation does not itself grant mutation authority. A module cannot bypass the kernel for a privileged action.

### Adapters / drivers

Adapters translate provider- or workload-specific interfaces, facts, configuration, errors, and state semantics behind agnostic capabilities.

Adapters MUST NOT invent policy, infer authority from credentials, broaden a requested capability, hide provider replacement/deletion semantics, or convert UNKNOWN into success. Mutation-capable adapters execute only a kernel-admitted bounded action when TOS-managed authority is involved.

### Workloads

Workloads own domain behavior and local safety controls. They maintain truthful durable state, fail closed on local ambiguity, expose facts/evidence/outcomes, and MAY expose explicit bounded action/repair primitives.

A workload MUST NOT require live TOS/TSAL availability to preserve already-approved local safety. TOS MUST NOT silently expand a workload's declared action surface.

### TSAL

TSAL owns the technology-agnostic automation lifecycle, risk/authority semantics, contracts, evidence/conformance semantics, compatibility expectations, and provider-neutral integration rules.

TSAL is not a TOS application, not runtime middleware, and not the TOS kernel. TOS consumes TSAL; TSAL core does not depend on TOS implementation.

## Canonical state

`.tos/project.yaml`, `.tos/facts.yaml`, `.tos/modules.yaml`, `.tos/task-graph.yaml`, `.tos/decisions.yaml`, `.tos/blockers.yaml`, `.tos/claims.yaml`, `.tos/evidence-index.yaml`, `.tos/promotions.yaml`, and `.tos/activity.jsonl` are canonical. SQLite is a derived local index and may be rebuilt.

## Version/adoption boundary

TSAL, TOS, and workload versions evolve independently.

A newer TSAL release MAY be detected automatically. TOS SHOULD eventually automate compatibility assessment and candidate construction where deterministic, but MUST NOT silently rewrite a workload merely because the standard changed.

If TSAL adoption changes committed workload content, that workload is a new exact candidate and must pass its own project versioning, tests, evidence, conformance, and release authority.

Restoring already-approved external/provider state without changing a repository candidate may be an operational repair rather than a software release.

## Non-bypass invariant

No AI agent, userland service, module, adapter, workload integration, or tool wrapper may bypass the execution kernel when exercising **TOS-managed privileged authority**.

Exceptions require an explicit governing decision identifying the capability, reason, compensating controls, owner authority, expiration/review trigger, and evidence. An emergency override does not erase the bypass risk or resulting audit record.

## Implementation baseline

Use a pnpm TypeScript monorepo on Node.js 24 LTS. Core packages include kernel, contracts, runtime, inspectors, scheduler, work-orders, evidence, promotion, recovery, module SDK, adapter SDK, and CLI. Provider-specific behavior remains outside the kernel unless a deterministic provider-neutral primitive genuinely belongs in the trusted core.
