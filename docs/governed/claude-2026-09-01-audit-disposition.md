# Claude 2026-09-01 Audit — Verification Disposition

**Document ID:** `TOS-DOC-AUDIT-0001-REVIEW`  
**Class:** audit  
**Review date:** 2026-09-01  
**Re-verification date:** 2026-09-05  
**Source:** externally supplied Claude `TOS CURRENT-STATE AUDIT` and `check-doc-freshness.mjs` prototype  
**Source status:** source material only; not canonical TOS truth

## Disposition

The Claude submission was treated as an untrusted external candidate. Its useful findings are retained as inputs to bounded TOS work, but neither the audit nor the prototype is adopted verbatim.

The original external artifacts remain source material. This repository records the independently verified disposition so that known errors are not promoted into canonical documentation.

## Verified or substantially supported findings

| Finding | Disposition |
|---|---|
| F-01 — canonical fact freshness is expired while CI uses pinned historical dates | Verified as a historical finding. Issue #23 reverified the expired canonical facts from observed repository/CI evidence and added a separate real-UTC-date fact/requirement/boot liveness gate while retaining pinned historical regression checks. |
| F-02 — JSON Schemas are not the sole/runtime enforcement mechanism | Supported as a historical architecture finding, not proof that validation is absent. Issue #21 repaired the incompatible canonical-decision/schema boundary and PR #31 promoted schema-backed decision validation into canonical `main`; schema coverage for other boundaries remains incomplete. |
| F-03 — `tos execute next` is not implemented in runtime 0.2.1 | Verified. It remains a planned primary proving workflow, not an existing runtime command. |
| F-04 — current CLI lacks a general structured JSON output contract | Verified for the inspected command surface. |
| F-05 — current `.tos` state is YAML-heavy while JSON-first is an approved direction | Verified as architectural transition, not authorization for mass conversion. |
| F-06 — canonical fact/decision records contain dangling repository evidence references | Verified as a historical finding. Issue #23 reconciled the known dangling fact/decision paths and made repository-backed evidence resolution fail closed through canonical-state validation, with negative tests for missing and unsupported references. |
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

### 2026-09-05 operational re-verification

The ancestry control exposed a real promotion failure after the Issue #23 work was squash-promoted: `.tos/document-freshness.json` retained `b24dc457e7d142c8fc0575f70d5ff64e28f80763`, a branch-local verification commit that was not an ancestor of canonical `main` at `355003e504463d85412f52eb0852f4640a8adebc`. As a result, the then-current `main` CI build/tests passed but governed-document freshness failed closed before later canonical validation steps could execute.

That failure was valid detection of invalid governance data, not a reason to weaken the checker. The missing rule was promotion semantics: squash/rebase/cherry-pick promotion can preserve content while replacing commit identity. A branch-local anchor cannot remain a canonical verification anchor unless promotion preserves its ancestry.

Issue #32 and PR #31 repaired that condition. PR #31 was promoted with a normal merge commit (`9fd5301a8271e9f0f6687f317ee83e085e1b9a29`) so the verified branch anchors remained in canonical ancestry, and post-merge TOS CI run #178 completed successfully on canonical `main`. `DOC_ANCHOR_NOT_ANCESTOR` remains fail-closed.

## Decision-schema re-verification

Issue #21 was re-audited on 2026-09-05 because its split-brain decision representation blocked safe addition of later architecture decisions. The verified defect was that `.tos/decisions.yaml` and `schemas/decision.schema.json` described incompatible decision objects and canonical project validation did not execute decision-schema validation.

PR #31 repaired and promoted that boundary. Canonical decision record v1 preserves the historical `.tos/decisions.yaml` representation, the JSON Schema now describes that representation, ordinary canonical validation executes schema-backed decision validation, supersession integrity is enforced, the legacy `TopShelf Op Sys` label is preserved without pretending it is a decision ID, and deliberate invalid fixtures exercise fail-closed behavior. Review-found invalid-regex and semantic-path defects were also fixed before promotion. Exact-candidate run #174 and post-merge canonical run #178 both completed successfully.

## Runtime-baseline re-verification

Issue #33 and PR #34 replaced the active Node.js 20/22 compatibility matrix with one Node.js 24 LTS implementation baseline. PR #34 was promoted with normal merge commit `a11f403cef087a0801f9239d1a69afb0d08dad9f`; post-merge TOS CI run #188 completed successfully on canonical `main`. `.nvmrc` is the single Node-version selector consumed by CI, while `package.json` constrains the implementation runtime to Node.js `>=24 <25`. Historical Node.js 20/22 evidence remains historical rather than being rewritten.

The runtime baseline is an implementation choice, not a universal project constraint; TOS-DEC-017 continues to require technology-agnostic governance.

## Decision-register authority re-verification

Issue #35 was opened after the Node-baseline audit found that `registers/decision-register.csv` reused `TOS-DEC-*` identifiers with meanings that conflict with schema-validated `.tos/decisions.yaml`. Repository search established that the CSV is part of the historical Foundation Contract Package rather than an active runtime decision consumer.

The legacy CSV is therefore classified as `historical_frozen` and `noncanonical`; `.tos/decisions.yaml` remains the only active authority for canonical `TOS-DEC-*` identifiers. The historical CSV is not rewritten to make its July decisions appear current, and current baseline changes are recorded through the canonical decision catalog instead.

Provenance checking also exposed a separate historical metadata defect: the current CSV and the copy at foundation evidence commit `80684d74793eb541cd493e9d8f5a94434b096539` resolve to the same Git blob `24c4f5c464e29d5c6d2bd73210fac934f189086f`, proving the file itself did not drift. However, the July `TOS_PACKAGE_MANIFEST.json` declares SHA-256 `0909b03c0827c710f532f708b69cebff2de1c39b80a91ea27b01bd14e027b93e`, while the preserved CSV bytes hash to `e8cd5086f84daaa28eb4ee8063571a496a969a96b5a11497485f8eb4492681fa`. The historical manifest declaration is retained as historical evidence, while the discrepancy is explicitly classified rather than silently corrected.

The register-authority guard fails closed on legacy CSV drift, canonical classification of the legacy register, unclassified additional decision CSVs, historical blob mismatch, or unauthorized changes to the preserved manifest declaration.

TOS-DEC-021 records Node.js 24 LTS as the canonical active implementation baseline and uses `supersedes_legacy_labels` to reference the old Foundation Package `TOS-DEC-005` label without pretending that label is a canonical decision record.

PR #36 promoted the decision-register authority repair with normal merge commit `3a0a1f6a3903d76dade490afa6fd2e55b15878b3`. Post-merge TOS CI #198 / Actions run `33948600841` completed successfully on that exact canonical `main` commit, and issue #35 closed as completed.

## Canonical project-baseline recording

Issue #37 and PR #38 record the post-#35 canonical project baseline without creating another runtime decision. The baseline source is the already-promoted and independently validated canonical `main` commit `3a0a1f6a3903d76dade490afa6fd2e55b15878b3`, not the later commit that records the baseline metadata.

`.tos/project.yaml` advances `state.last_reconciled` to `2026-09-05`. `TOS-EVD-011` records the exact baseline source commit and successful TOS CI #198 under the active Node.js 24 LTS baseline. `TOS-ACT-023` appends a `baseline_recorded` event tied to that evidence. Earlier Node.js 20/22 evidence remains historical and unchanged.

This separation prevents a self-referential baseline: the baseline record describes a commit that was already canonical and fully validated before the record was authored. The runtime choice continues to be governed by TOS-DEC-021; the project-baseline record is evidence/reconciliation state, not a new architectural decision.

## Separation of work

This disposition keeps work boundaries explicit while recording completed and active blockers accurately:

- **#22:** session bootstrap and governed-document freshness control, including valid verification-anchor lineage;
- **#23:** current canonical fact/requirement/boot liveness and dangling evidence resolution — completed;
- **#21:** canonical decision object/schema enforcement — completed through PR #31;
- **#32:** governed-document anchor-lineage repair and promotion semantics — completed through PR #31;
- **#33:** single Node.js 24 LTS active runtime baseline — completed through PR #34 and canonical CI #188;
- **#35:** legacy decision-register authority classification, historical manifest discrepancy preservation, and canonical TOS-DEC-021 baseline recording — completed through PR #36 and canonical CI #198;
- **#37:** post-#35 canonical project-baseline evidence and reconciliation record — carried by PR #38 at this re-verification point;
- **TOS bounded autonomous execution:** future `tos execute next` implementation and its independent verification/promotion controls.

No external model output becomes canonical solely because another model produced it.
