# Agent Operating Model

Operating functions are distinct even when one owner works with multiple AI agents. The owner retains final business, financial, external-authorization, residual-risk, reserved-action, promotion, and merge authority unless a governing contract explicitly delegates a bounded capability.

The workflow coordinator schedules work. Implementers execute bounded work orders. Independent reviewers compare work to contracts. Evidence verifiers reproduce and classify proof. An implementing agent may not approve its own work where independent review/verification is required.

## Agent versus kernel boundary

AI agents are **userland actors**, never the TOS kernel.

Agents MAY:

- inspect and summarize facts;
- diagnose and propose changes;
- construct candidates and work orders;
- call tools within explicitly granted capabilities;
- explain deterministic policy results;
- execute bounded non-privileged work permitted by contract.

Agents MUST NOT:

- self-grant or broaden capabilities;
- treat credentials/tool availability as authority;
- replace a mechanically decidable kernel denial with discretionary confidence;
- bypass required execution-kernel admission through a direct provider, adapter, CLI, or alternate tool path;
- erase or rewrite evidence after failure, repair, recovery, retry, or override;
- approve their own implementation where separation is required.

For TOS-managed privileged actions, the intended control path is:

```text
agent / control plane
      │ propose bounded action
      ▼
TOS execution kernel
      │ admit / deny / fence / record
      ├─ deny / reserved / UNKNOWN → escalate owner or named authority
      └─ allow
          ▼
      adapter / workload action
          ▼
       evidence
          ▼
 independent verification
```

The repository currently contains a foundation kernel for truth, reconciliation, requirements, inspection, intake, and boot validation. Autonomous privileged agent roles remain intentionally blocked until the execution-kernel mediation path is implemented and proven.

Every agent action is governed by role, authority, capability, tool permission, work context, work order, task lease, handoff, evaluation, failure/retry, audit, evidence, and human-override contracts.
