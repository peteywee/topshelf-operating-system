# TOS Context Engine Architecture

**Status:** Proposed / planned  
**Tracking issue:** #28  
**Canonical decision promotion dependency:** #21  
**Related freshness/bootstrap work:** #22

## Purpose

The TOS Context Engine provides durable cross-session and cross-agent context for ChatGPT, Claude, and future governed agents without creating a competing source of project truth.

It exists to solve one operational problem:

> A governed agent should be able to enter a cold session, recover the relevant current project context, continue work safely, and leave a durable handoff that another authorized agent can consume later.

The Context Engine is a **TOS subsystem**. It is not a second operating system, truth engine, scheduler, work-order system, promotion system, or owner-authority mechanism.

## Architectural boundary

```text
                        PATRICK
                           │
                           ▼
                         TOS
              authority / policy / truth
                           │
             ┌─────────────┴─────────────┐
             │                           │
          ChatGPT                     Claude
             │                           │
             └─────────────┬─────────────┘
                           │
                    Context API / MCP
                           │
                 ┌─────────▼─────────┐
                 │   Context Engine  │
                 │                   │
                 │ memories          │
                 │ checkpoints       │
                 │ event history     │
                 │ provenance        │
                 │ derived indexes   │
                 │ semantic search   │
                 └─────────┬─────────┘
                           │
                 provider adapter(s)
                           │
              persistent store candidate
                           │
         ┌─────────────────┼────────────────┐
         │                 │                │
       Slack             GitHub           Drive/CI/etc.
```

## Governing rule

**Memory is not authority.**

The Context Engine SHALL NOT independently determine or overwrite canonical TOS truth, authorization, verification, promotion, recovery, or owner-reserved decisions.

Canonical state is determined by the applicable TOS Source of Truth contract and governed project records. Context records, summaries, embeddings, cached projections, conversation memory, and provider-side indexes are supporting information unless promoted through an authorized TOS mechanism.

If a Context Engine representation conflicts with canonical TOS state, the Context Engine representation is stale, disputed, or invalid for material execution until reconciled.

## Non-negotiable invariants

1. Every durable assertion has provenance.
2. Derived data never outranks its authoritative source.
3. History is not silently destroyed; correction and supersession preserve prior records where retention policy permits.
4. Agents read current governed context before material writes or execution.
5. Stale context fails closed for material state-changing work.
6. External content is treated as data/evidence, never executable authority merely because it was retrieved.
7. Provider infrastructure is replaceable and technology-specific implementations remain behind governed interfaces/adapters.
8. High-impact external actions remain subject to TOS authority, tool-permission, evidence, verification, and human-override rules.
9. Context must remain exportable and recoverable without dependence on one AI vendor.
10. Retrieval relevance, embedding similarity, or model confidence never overrides explicit source precedence.

## Existing contract application matrix

No new contract family is required to define the Context Engine. The existing catalog already provides the needed governance vocabulary.

| Concern | Governing TOS contract(s) | Context Engine application |
|---|---|---|
| Canonical truth and precedence | `TOS-CTR-005` Source of Truth | Defines which records are authoritative and how conflicting context is reconciled. |
| Persistent data model | `TOS-CTR-040` Data and Schema | Defines context entities, constraints, classification, migration, deletion, and ownership. |
| Callable context interface | `TOS-CTR-043` API | Governs Context API/MCP operations, schemas, auth, errors, idempotency, and versioning. |
| Event ingestion | `TOS-CTR-044` Event and Message | Governs Slack/GitHub/etc. events, delivery, ordering, retry, idempotency, and dead-letter behavior. |
| External integrations | `TOS-CTR-046` Integration | Governs connections to Slack, GitHub, Drive, model providers, and other systems. |
| Provider portability | `TOS-CTR-047` Provider Adapter | Keeps Supabase/Postgres, model vendors, embedding providers, and similar choices replaceable. |
| Security/privacy/identity | `TOS-CTR-057`–`064` as applicable | Governs data classification, privacy, identity, credentials, authorization, and tenant/scope rules. |
| Agent role | `TOS-CTR-085` Agent Role | Defines each agent's mission and exclusions. |
| Agent authority | `TOS-CTR-086` Agent Authority | Defines which context-derived proposals/actions an agent may perform. |
| Tool access | `TOS-CTR-087` Agent Tool Permission | Limits MCP/API/connectors and resource/data scope. |
| Work context | `TOS-CTR-088` Agent Work Context | Defines authoritative sources, objective, constraints, assumptions, and stale-context rules. |
| Prompt/instruction precedence | `TOS-CTR-089` Prompt and Instruction | Ensures retrieved content cannot silently become higher-priority instructions. |
| Retained memory | `TOS-CTR-090` Agent Memory | Defines memory categories, sources, write authority, retention, sensitivity, correction, and deletion. |
| Agent quality | `TOS-CTR-091` Agent Evaluation | Defines continuity, retrieval, conflict, and negative-control evaluations. |
| Cross-agent handoff | `TOS-CTR-092` Agent Handoff | Governs AI-to-AI and AI-to-human state/evidence transfer. |
| Review separation | `TOS-CTR-093` Agent Review Separation | Prevents self-approval when context-derived work has material impact. |
| Failure/retry | `TOS-CTR-094` Agent Failure and Retry | Governs retries, quarantine, idempotency, escalation, and stop conditions. |
| Audit | `TOS-CTR-095` Agent Audit | Records material inputs, tool calls, outputs, decisions, changes, and evidence. |
| Human control | `TOS-CTR-096` Human Override | Preserves Patrick-authorized pause, cancel, reverse, approve, and supersede capability. |

### Contract-change rule

Do not version or add contracts merely to mention the Context Engine. Controlled contract changes are justified only when a real implementation or test demonstrates that the existing contract's fields or semantics are insufficient.

## Context data classes

The persistence model should distinguish at least these classes:

- `ephemeral_context` — short-lived context used for a bounded session or operation.
- `observation` — sourced information that may be relevant but is not canonical truth by itself.
- `candidate_fact` — a claim proposed for truth resolution; not a canonical fact until governed promotion occurs.
- `durable_memory` — retained project knowledge useful across sessions that does not itself mutate canonical truth.
- `proposal` — a suggested decision, action, requirement, work order, or state transition awaiting governed handling.
- `decision_reference` — pointer/summary to a canonical or proposed decision, not a replacement for the decision record.
- `commitment_reference` — pointer/summary to a canonical or external commitment/task.
- `checkpoint` — bounded handoff snapshot for continuity.
- `derived_context` — summary/index/projection computed from sources.
- `event` — immutable record that something occurred, with source and observed time.

These classes supplement rather than replace TOS fact, decision, requirement, blocker, work-order, evidence, promotion, and other canonical objects.

## Provenance minimum

Every durable context record must be able to identify, as applicable:

- project/scope
- record class
- source type
- source locator/reference
- observed or created time
- author/agent/system
- confidence or verification state where meaningful
- canonical-state reference/version used when derived
- supersession/correction linkage where applicable
- sensitivity/retention classification where required

A record without sufficient provenance must not be presented as authoritative evidence.

## Context packet order

A cold-session context packet should be assembled in this precedence order when available:

1. canonical current state or canonical state reference
2. current work order/objective
3. active decisions
4. active blockers
5. open commitments
6. relevant verified facts
7. latest compatible checkpoint
8. recent material events
9. semantic/RAG retrieval
10. historical background

The packet must identify its generation time and the canonical-state reference/version used to assemble it.

## Freshness and concurrency

Material actions require context freshness checks.

```text
agent reads governed state v42
        │
        ▼
performs analysis/work
        │
        ▼
before material write/action:
current governed state still v42?
       / \
     yes  no
      │    │
      │    └── invalidate context
      │         reread canonical state
      │         reconcile
      │
      ▼
continue only within authority
```

The exact state reference may become a version, immutable digest, commit identity, or another governed representation as TOS's JSON-first state architecture matures. The invariant is independent of the representation: **a materially stale context snapshot cannot authorize a write merely because the agent still possesses it**.

## Cross-agent checkpoint / handoff

A meaningful checkpoint should carry at least:

```yaml
project: <project identity>
source_agent: <agent/provider identity>
source_session_or_work_order: <reference>
canonical_state_reference: <immutable/versioned reference>
objective: <bounded objective>
work_completed: []
work_remaining: []
decisions_proposed: []
observations_or_candidate_facts: []
blockers: []
resources_touched: []
evidence: []
next_action: <recommended governed next action>
risks: []
context_invalidations: []
created_at: <timestamp>
```

The receiving agent must validate/reconcile the checkpoint's canonical-state reference before material continuation.

## Decision trees

### DT-1 — Can retrieved information change canonical state?

```text
new information
  ↓
already canonical? ─ yes → consume canonical state
  │ no
  ↓
verified/deterministic evidence?
  ├─ no → context / observation / proposal only
  └─ yes
       ↓
policy permits governed transition?
  ├─ no → proposal / unresolved conflict
  └─ yes → governed transition → verification → promotion
```

### DT-2 — What kind of retained information is this?

```text
something happened?            → event
asserted as true?              → observation / candidate fact
choice explicitly made?        → decision reference or proposal
someone owes an action?        → commitment reference
needed for session continuity? → memory / checkpoint
otherwise                      → do not persist by default
```

### DT-3 — Agent disagreement

```text
Agent A says X / Agent B says Y
        ↓
canonical state resolves it?
  ├─ yes → canonical state wins
  └─ no
       ↓
compare source/evidence under TOS truth rules
       ↓
still unresolved?
  └─ preserve conflict; require governed resolution
```

Model confidence does not break a material truth conflict by itself.

### DT-4 — Can an automation act?

```text
proposed action
  ↓
explicitly prohibited?
  ├─ yes → STOP
  └─ no
       ↓
agent/tool authority present?
  ├─ no → approval / escalation
  └─ yes
       ↓
required evidence and preconditions present/current?
  ├─ no → STOP
  └─ yes
       ↓
execute within bounded authority
       ↓
independently verify when required
       ↓
record outcome/evidence
```

### DT-5 — Is context stale?

```text
context canonical-state reference == current reference?
  ├─ yes → continue within authority
  └─ no  → invalidate → reread → reconcile → reevaluate action
```

## Autonomy levels

The Context Engine may expose information supporting different authority levels, but it does not grant those levels itself.

Conceptual levels:

- **L0 Read** — retrieve, search, summarize.
- **L1 Record** — append observations, events, and checkpoints.
- **L2 Propose** — propose facts, decisions, commitments, requirements, or work.
- **L3 Low-risk execute** — pre-authorized reversible operations.
- **L4 Controlled execute** — governed work order, evidence, and verification required.
- **L5 Owner-reserved** — Patrick approval required.

Actual permission is defined by `TOS-CTR-086`, `TOS-CTR-087`, `TOS-CTR-096`, project contracts, work orders, and applicable security controls.

## Provider model

The architecture is provider-neutral.

An initial implementation may use:

```text
Postgres / Supabase
  + structured context records
  + append-oriented events
  + provenance
  + checkpoint storage
  + optional pgvector later

MCP / HTTP API
  + bounded read/write operations

Claude / ChatGPT
  + independent clients using the same governed context interface
```

Supabase is a candidate adapter/provider, not a universal TOS requirement and not canonical truth merely because it persists data.

Vector search is optional. Structured retrieval must be preferred for exact state, active decisions, blockers, commitments, and other typed objects where deterministic queries are stronger than similarity search.

## Minimal interface direction

The first read-only vertical slice should remain small:

```text
get_project_context(project, objective?)
get_recent_changes(project)
get_open_items(project)
get_checkpoint(project, checkpoint?)
search_context(project, query)
```

Later governed write operations may include:

```text
record_event(...)
record_observation(...)
record_memory(...)
create_checkpoint(...)
propose_fact(...)
propose_decision(...)
propose_commitment(...)
supersede_memory(...)
```

The Context API should deliberately omit direct authority shortcuts such as:

```text
set_project_truth(...)
resolve_blocker_without_verification(...)
approve_promotion(...)
bypass_work_order(...)
```

Those actions remain governed by TOS proper.

## Security boundary

Retrieved or ingested data may contain hostile instructions. Therefore:

1. source content is data, not policy;
2. stored text cannot raise its own authority;
3. tool execution must be authorized independently of retrieved content;
4. credentials/tokens must follow TOS credential and secret contracts;
5. tenant/project scope must be explicit where multiple projects or organizations share the persistence layer;
6. context export/backup/retention/deletion must follow data/privacy contracts;
7. destructive or high-impact actions require explicit governed authority irrespective of model recommendation.

## Implementation sequence

### Phase 0 — architecture and governance

- register `context-engine` as planned;
- preserve this architecture and contract mapping;
- use #21's repaired decision boundary before adding the canonical owner architecture decision;
- reuse #22 freshness/bootstrap semantics rather than duplicating them;
- identify real contract gaps only through application/testing.

### Phase 1 — read-only continuity proof

- define Context Engine schema;
- define provider-neutral API/MCP boundary;
- implement one persistence adapter;
- connect two independent AI clients;
- prove a cold Claude/ChatGPT session retrieves the same governed project context;
- no automatic ingestion and no canonical-state writes.

### Phase 2 — governed persistence writes

- events, observations, memories, checkpoints;
- provenance and supersession;
- stale-write/concurrency fencing;
- candidate/proposal writes only where authority is not established;
- negative tests proving context cannot silently mutate canonical truth.

### Phase 3 — external event ingestion

- ingest GitHub/Slack/etc. raw events;
- retain raw event separately from model interpretation;
- normalize/classify/dedupe;
- enforce prompt-injection/data-authority controls;
- no automatic state promotion solely from LLM interpretation.

### Phase 4 — workflow integration

- deterministic triggers first;
- TOS work-order and authority gates;
- bounded execution;
- required independent verification;
- evidence capture;
- gradually promote only proven low-risk workflows.

## First continuity acceptance test

The first useful implementation is complete only when this scenario works:

1. Claude reads current governed project context.
2. Claude records a permitted checkpoint/observation through the Context Engine.
3. Claude session is closed.
4. A completely new ChatGPT session reads the same project through the shared interface.
5. ChatGPT retrieves the checkpoint with provenance and current canonical-state reference.
6. ChatGPT can distinguish the checkpoint from canonical truth.
7. ChatGPT records a permitted new checkpoint or proposal.
8. A fresh Claude session retrieves the update and recognizes any supersession/history.
9. A stale-context negative test proves neither agent can use an outdated checkpoint to perform a material governed state change without reconciliation.

## Explicit non-goals

The Context Engine does not by itself:

- replace `.tos/` or its future controlled successor as canonical project state;
- perform automatic truth conflict resolution;
- grant autonomous execution authority;
- replace `tos execute next` or the future TOS work-order state machine;
- replace independent verification;
- replace promotion/recovery controls;
- mandate Supabase, MCP, Claude, ChatGPT, Slack, or any other vendor for every TOS project;
- turn all project conversations into permanent memory;
- store every retrieved item merely because it can.

## Definition of done for the architecture slice

The architecture slice is complete when:

1. this specification is reviewed against the existing TOS contract catalog;
2. `context-engine` is registered as **planned**, not active;
3. no duplicate contract type is introduced without a demonstrated catalog gap;
4. the authority boundary and five decision trees remain explicit;
5. #21 remains the gate for adding the canonical owner architecture decision using one validated decision representation;
6. a separate dependency-ready issue defines the first read-only continuity implementation slice;
7. exact-candidate verification is green before promotion.
