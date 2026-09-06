# Official Identity, Naming, and Controlled Vocabulary

## Official identity

- Official product name: **TopShelf Operating System**
- Official short name: **TOS**
- Core repository: `topshelf-operating-system`
- CLI: `tos`
- Project state directory: `.tos/`
- Contract identifier: `TOS-CTR-###`
- Decision identifier: `TOS-DEC-###`
- Requirement identifier: `TOS-REQ-###`
- Evidence identifier: `TOS-EVD-###`
- Risk identifier: `TOS-RSK-###`
- Issue identifier: `TOS-ISS-###`
- Change identifier: `TOS-CHG-###`
- Task identifier: `<PROJECT>-<WORKSTREAM>-###`

## Controlled vocabulary

These definitions are normative across TOS architecture, contracts, modules, adapters, agents, and project integrations. A narrower contract MAY refine a term but MUST NOT silently reverse its meaning.

- **Owner** — the ultimate human or formally designated authority that sets business intent, grants or withholds authority, accepts residual risk, reserves protected actions, and receives escalations that exceed automated authority or certainty.
- **TOS** — the complete TopShelf Operating System: kernel, runtime/system services, control-plane/userland capabilities, modules, adapters, CLI/UI surfaces, canonical state, and governance used to operate projects and workloads.
- **TOS kernel** — the deterministic trusted core of TOS that owns canonical policy primitives and is the required enforcement boundary for TOS-managed privileged actions. The kernel is not an AI agent and does not infer authority from intent or credentials.
- **Execution kernel** — the kernel capability that admits, rejects, fences, records, and verifies privileged execution. Until this capability is implemented and proven, autonomous privileged execution remains prohibited.
- **Control plane** — TOS userland that observes, diagnoses, plans, proposes actions, coordinates workflows, and presents decisions. It may be intelligent or AI-assisted, but it does not grant itself execution authority.
- **Userland** — TOS components outside the kernel, including CLI/UI, agents, planners, schedulers, modules, and orchestration services. Userland may propose privileged actions but MUST NOT bypass kernel admission when TOS-managed authority is exercised.
- **Runtime/system service** — an executable TOS service such as truth reconciliation, scheduling, evidence handling, promotion, recovery, or work-order compilation. A runtime service is not automatically part of the trusted kernel merely because it runs inside TOS.
- **Module** — a versioned TOS capability selected from project facts and activated under explicit contracts. A module does not gain authority merely by being installed or active.
- **Adapter** — a provider- or project-specific implementation behind an agnostic interface. An adapter translates capabilities, configuration, facts, errors, and provider semantics; it MUST NOT invent policy or authority.
- **Workload** — an independently safe domain system operated or observed by TOS, such as XQueue or Teach. A workload is not a TOS module and does not require live TOS/TSAL availability to preserve its approved local safety properties.
- **TSAL** — Top Shelf Automation Lifecycle, the technology-agnostic automation standard that defines lifecycle, contracts, risk/authority semantics, evidence, conformance, and compatibility expectations. TSAL is not a TOS application, runtime middleware, or authority source by itself.
- **Contract** — a versioned, owned, testable control defining scope, terms, obligations, permissions, prohibitions, failure behavior, evidence, validation, and change/exit rules.
- **Capability** — an explicitly named action or class of actions that may be granted, denied, narrowed, reserved, or delegated. Possession of credentials is not possession of a capability grant.
- **Authority** — a policy-backed right to make or execute a bounded class of decisions/actions within declared scope, time, target, and conditions.
- **Credential** — a secret, token, key, identity, session, or technical mechanism that may enable access. A credential proves access possibility, not authorization to use every reachable capability.
- **Privileged action** — any TOS-managed action that can mutate canonical state, external/provider state, security/identity state, financial state, public state, production state, release/promotion state, or another protected authority surface.
- **Bounded action** — an action whose target, allowed effect, authority source, preconditions, blast radius, failure behavior, evidence, and verification requirements are explicit enough to admit or reject deterministically.
- **Reserved action** — a capability that policy keeps with the owner or another explicit authority and that automation may not self-grant or silently delegate.
- **Kernel mediation** — the rule that a TOS-managed privileged action must be admitted through the kernel's deterministic authority/policy boundary before execution and must produce required evidence afterward.
- **Observation** — a read-only acquisition of facts or external reality. Observation does not itself authorize mutation.
- **Repair** — a bounded action intended to restore already-approved declared state after drift or failure without silently expanding scope or policy.
- **Recovery** — the controlled process of returning a system to a known safe state after failure, ambiguity, or partial execution; recovery may include repair, rollback, reconciliation, quarantine, or escalation.
- **Reconciliation** — comparison of competing or ambiguous sources of truth to determine the best-supported current state without manufacturing certainty.
- **Verification** — independent or mechanically reproducible evaluation that required outcomes and evidence match the exact candidate/action claimed.
- **Evidence** — durable proof supporting a specific claim about a candidate, execution, deployment, runtime state, reconciliation, or attestation.
- **Exact candidate** — the immutable commit/artifact identity to which candidate evidence and release decisions apply.
- **Escalation** — transfer of an unresolved decision to an authority capable of deciding it when automation lacks sufficient authority, certainty, repair budget, or policy.
- **Fail closed** — refuse or stop a protected action when required authority, identity, state, evidence, or certainty cannot be established.
- **UNKNOWN** — an explicit truth state meaning the system does not have enough reliable evidence to assert a safer state. UNKNOWN MUST NOT be coerced to PASS merely to continue automation.
- **Adoption** — an explicit decision to make a project/workload target a newer standard, contract, module, or interface. Detection of a newer version is not adoption.
- **Override** — an explicitly authorized decision to supersede normal policy for a bounded reason. An override MUST be attributable and preserved in evidence; it does not erase the original failure or observation.

## Naming rules

Files and directories use lowercase kebab-case except controlled uppercase IDs. YAML keys use snake_case. TypeScript packages use the repository's established `@topshelf-os/<capability>` namespace. Runtime commands use lowercase verbs. Every acronym is defined before use. Deprecated aliases are recorded, never silently reused.

The terms **kernel**, **control plane**, **runtime**, **module**, **adapter**, **workload**, and **TSAL** are not interchangeable. Architecture diagrams and contracts MUST use the controlled term that matches the actual responsibility boundary.