# Module, Adapter, and Upgrade Model

Modules are selected from project facts, not preference. Each module declares provides, requires, recommends, conflicts, activation rules, contracts, checks, migrations, and removal requirements.

Adapters implement agnostic capabilities for providers such as GitHub, Vercel, Supabase, Cloudflare, Docker, PostgreSQL, Gmail, and Google Calendar. Provider details do not enter the kernel contract.

## TSAL and workload upgrade boundary

TSAL, TOS, and governed workloads have independent version lines.

A new TSAL version is an input to compatibility assessment, not an instruction to mutate every workload.

```text
new TSAL release
      │
      ▼
detect
      │
      ▼
assess affected workloads
   ┌──┴──────────────┐
   │                 │
unaffected        adoption needed
   │                 │
no change         build exact candidate
                     │
                     ▼
                test / audit / evidence
                     │
                     ▼
                workload release decision
```

TOS SHOULD eventually automate detection, compatibility analysis, and candidate preparation where those steps are deterministic. Autonomous adoption is permitted only when an explicit policy grants that authority and all candidate/deployment/runtime gates required by the workload's risk class can be proven.

If adoption changes committed workload content, the workload follows its own versioning policy. An already-proven workload release is immutable historical evidence and MUST NOT be retroactively redefined as targeting a newer standard.

Restoring external/provider state to an already-approved configuration without changing repository content is an operational repair and does not inherently require a software version bump.

## Ownership and upgrade rules

Every generated project records its TOS version and active modules. TOS-owned file upgrades use three-way ownership rules: unchanged TOS-owned files may update automatically; modified TOS-owned files require merge; project-owned files are not overwritten. Skipped changes require an upgrade decision.

TSAL-governed workload content is not automatically classified as TOS-owned merely because TOS manages the project. TOS must respect project ownership and the workload's own release boundaries.

The governing architecture decision is `docs/architecture/tsal-tos-workload-boundary.md`.
