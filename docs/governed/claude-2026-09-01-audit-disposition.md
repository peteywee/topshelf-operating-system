# Claude 2026-09-01 Audit — Verification Disposition

**Document ID:** `TOS-DOC-AUDIT-0001-REVIEW`  
**Class:** audit  
**Review date:** 2026-09-01  
**Source:** externally supplied Claude `TOS CURRENT-STATE AUDIT` and `check-doc-freshness.mjs` prototype  
**Source status:** source material only; not canonical TOS truth

## Disposition

The Claude submission was treated as an untrusted external candidate. Its useful findings are retained as inputs to bounded TOS work, but neither the audit nor the prototype is adopted verbatim.

The original external artifacts remain source material. This repository records the independently verified disposition so that known errors are not promoted into canonical documentation.

## Verified or substantially supported findings

| Finding | Disposition |
|---|---|
| F-01 — canonical fact freshness is expired while CI uses pinned historical dates | Verified. Current-date liveness work belongs to #23. |
| F-02 — JSON Schemas are not the sole/runtime enforcement mechanism | Supported. Treat as architecture/schema-enforcement work, not proof that validation is absent. |
| F-03 — `tos execute next` is not implemented in runtime 0.2.1 | Verified. It remains a planned primary proving workflow, not an existing runtime command. |
| F-04 — current CLI lacks a general structured JSON output contract | Verified for the inspected command surface. |
| F-05 — current `.tos` state is YAML-heavy while JSON-first is an approved direction | Verified as architectural transition, not authorization for mass conversion. |
| F-06 — canonical fact/decision records contain dangling repository evidence references | Verified. Resolution and semantic evidence validation belong to #23. |
| F-07 — predecessor/template authority text is stale relative to current owner direction | Verified as historical drift; preserve supersession rather than rewriting history. |
| F-08 — Teach has substantial governance patterns not presently implemented as TOS adoption | Supported with scope. Teach is a proving workload and source of lessons, not proof that TOS already governs it. |
| F-09 — current proving workloads do not yet prove non-Node execution portability | Supported as an assurance limitation, not a contradiction of technology-agnostic governance design. |

## Rejected finding: F-10

Claude stated that the old TOS 0.3 planning branch would delete the TOS 0.2.1 intake implementation if merged because the branch was behind `main` and a two-dot diff showed newer `main` files as absent.

That conclusion is not supported by Git merge semantics or the actual PR patch.

The branch was based before the 0.2.1 commits, but its actual contribution was additive project-management documentation. A branch being behind means it must be reconciled against the current base and the resulting candidate verified. It does not by itself mean newer base files will be deleted by a three-way merge.

Correct doctrine:

> Behind or diverged branches require reconciliation and exact-candidate verification. Do not infer merge-result deletions from `git diff base..branch` alone.

## Stale audit state

The external audit also contains state that became stale during the same day, including issue/PR counts and an earlier description of the architecture-reconciliation branch. Current GitHub state must be obtained during session bootstrap rather than copied from the audit.

The audit contains an internal historical limitation paragraph saying TOS could not be verified as current `main`, while a later revision states a direct clone established current `origin/main`. The later direct-repository evidence supersedes that earlier limitation for TOS; both statements must not be presented together as current claims.

## Prototype disposition

Claude's `check-doc-freshness.mjs` established a useful concept—exact-commit freshness for verified prose—but the supplied implementation fails closed inadequately.

Independently reproduced failure modes include:

- removing the document-local anchor causes the document to disappear from governance;
- misspelling `verified` can downgrade a claim to `not_checked`;
- duplicate document IDs are accepted;
- editing verified prose can still report current when dependencies are unchanged;
- a missing docs directory can produce an empty successful result;
- a divergent/non-ancestor anchor is not explicitly rejected.

The adopted implementation therefore uses an external JSON registry, explicit governed roots, strict state/class/path validation, document self-change detection, full SHA anchors, ancestry validation, structured failure output, and negative tests.

## Separation of work

This disposition intentionally keeps three work boundaries separate:

- **#22:** session bootstrap and governed-document freshness;
- **#23:** current canonical fact/requirement/boot liveness and dangling evidence resolution;
- **TOS bounded autonomous execution:** future `tos execute next` implementation and its independent verification/promotion controls.

No external model output becomes canonical solely because another model produced it.
