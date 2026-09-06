# Governing Decision

The official product name is **TopShelf Operating System**. The official short name is **TOS**. The phrase "TopShelf Op Sys" is superseded and must not appear in current product naming except in historical migration notes.

TOS is a project operating system for a solo owner working with AI agents. It must inspect, define, contract, schedule, constrain, verify, promote, recover, upgrade, and learn across projects.

## Governing architecture boundary

TOS is the autonomous **operator/control plane**, not the automation standard itself. TSAL defines the technology-agnostic rules, contracts, evidence semantics, conformance, and compatibility expectations that TOS consumes. Workloads such as XQueue and Teach retain their own domain behavior and local fail-closed safety controls.

The governing dependency direction is:

```text
TOS -> TSAL interfaces/schemas
TOS -> workload interfaces / declared bounded actions
workload -> TSAL schemas/contracts
```

The following directions are prohibited without an explicit superseding governing decision:

```text
TSAL core -> TOS implementation
TSAL core -> workload implementation
workload runtime -> TOS as a prerequisite for local safety
standards release -> silent workload mutation
```

A new TSAL version may be detected and assessed automatically, but adoption that changes a workload is an explicit workload candidate subject to that workload's own versioning, verification, evidence, and release authority.

The canonical detailed decision is `docs/architecture/tsal-tos-workload-boundary.md`. Future TOS architecture and implementation MUST preserve that boundary unless the owner explicitly approves a replacement decision with compatibility and migration evidence.

Every foundation concern is represented in `registers/contract-register.csv` and has an agnostic template. Each project must evaluate every entry as required, conditional, or not applicable with a recorded reason. No unnamed or silently omitted foundation concern is permitted.
