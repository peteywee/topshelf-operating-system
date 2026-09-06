# System Architecture

TOS consists of a stable kernel, executable runtime, versioned modules, provider adapters, project instances, and a human authority layer.

TOS is the cross-project **control plane/operator**. It consumes TSAL through neutral interfaces and consumes workload facts/actions through declared project interfaces. It must not become part of TSAL core, and workloads must not require TOS availability to preserve local safety.

## Canonical responsibility model

```text
                              OWNER
                               │
                         goals / limits
                               │
                               ▼
                              TOS
                observe → decide → execute
                     → verify → escalate
                      │             │
                      │             ▼
                      │           TSAL
                      │      rules/contracts/proof
                      │             ▲
                      ▼             │
             XQueue / Teach / future workloads
                facts / evidence / bounded actions
```

The diagram is not a runtime middleware chain. TOS may read TSAL and workload interfaces directly.

### TSAL owns

- lifecycle and automation invariants;
- risk/authority semantics;
- automation contracts;
- evidence and conformance semantics;
- compatibility expectations;
- provider-neutral integration interfaces.

### TOS owns

- cross-project observation;
- policy evaluation;
- change/drift detection;
- bounded autonomous decision and action;
- compatibility assessment;
- repair orchestration;
- independent verification;
- evidence retention and escalation.

### Workloads own

- domain behavior;
- local truthful durable state;
- local fail-closed controls;
- bounded project-specific repair/action primitives;
- safe operation when TOS/TSAL services are unavailable.

The detailed governing boundary is `docs/architecture/tsal-tos-workload-boundary.md`.

## Kernel

Owns schemas, controlled vocabulary, state machines, policy evaluation, contract registration, compatibility rules, and validation primitives for TOS itself. The kernel may model TSAL interfaces but MUST NOT duplicate or fork TSAL's canonical standard.

## Runtime

Owns the CLI, repository inspection, interactive intake, truth resolution, scheduler, work-order compiler, task leases, evidence capture, promotion control, recovery, upgrade, lesson propagation, and eventually the observe → diagnose → repair → verify → escalate control loop.

Runtime authority is bounded by TOS policy, TSAL-compatible contracts, and workload-declared action surfaces. Credentials alone never imply mutation authority.

## Canonical state

`.tos/project.yaml`, `.tos/facts.yaml`, `.tos/modules.yaml`, `.tos/task-graph.yaml`, `.tos/decisions.yaml`, `.tos/blockers.yaml`, `.tos/claims.yaml`, `.tos/evidence-index.yaml`, `.tos/promotions.yaml`, and `.tos/activity.jsonl` are canonical. SQLite is a derived local index and may be rebuilt.

## Version/adoption boundary

TSAL, TOS, and workload versions evolve independently.

A newer TSAL release MAY be detected automatically. TOS SHOULD eventually automate compatibility assessment and candidate construction where deterministic, but MUST NOT silently rewrite a workload merely because the standard changed.

If TSAL adoption changes committed workload content, that workload is a new exact candidate and must pass its own project versioning, tests, evidence, conformance, and release authority.

Restoring already-approved external/provider state without changing a repository candidate may be an operational repair rather than a software release.

## Implementation baseline

Use a pnpm TypeScript monorepo on Node.js 24 LTS. Core packages: kernel, contracts, runtime, inspectors, scheduler, work-orders, evidence, promotion, recovery, module SDK, adapter SDK, and CLI. Providers remain outside the kernel.
