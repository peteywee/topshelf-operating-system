# Session Bootstrap and Governed Documentation Freshness

**Document ID:** `TOS-DOC-GOV-0001`  
**Class:** governance  
**Authority:** Patrick Craven  
**Control owner:** TopShelf Operating System  
**Adoption issue:** #22

## Purpose

Substantive TOS sessions must establish current repository truth before making verified claims, and governed documentation that asserts verified repository state must not silently outlive the exact repository state against which it was verified.

This control separates three questions that must not be conflated:

1. **Truth:** was the claim actually established by evidence?
2. **Freshness:** has the verified prose or a declared dependency changed since that evidence anchor?
3. **Authority:** is the actor allowed to publish, approve, merge, or promote the resulting change?

Document freshness does not prove truth. It only invalidates a previous verification claim when the document or its declared repository dependencies have moved.

## Session bootstrap protocol

Before making a verified repository-state claim in a substantive TOS engineering or documentation session:

1. Establish the canonical repository and default branch.
2. Resolve the exact default-branch HEAD commit.
3. Inspect open material branches and pull requests that may affect the subject.
4. Inspect version and release identity relevant to the claim.
5. Evaluate canonical fact, requirement, and boot freshness using the real current UTC date when those semantics are time-sensitive.
6. Distinguish repository state from conversation history and external model output.
7. Re-run the relevant bootstrap checks after a material repository change and before publishing a new verified document.

A historical SHA remains valid historical evidence, but it must not be presented as current state without current verification.

## Governed document registry

Governed documentation is declared in `.tos/document-freshness.json`.

The registry is external to the Markdown document deliberately. Embedding the verification commit inside the same document creates a self-referential identity problem: changing the embedded SHA changes the document, which changes the commit that the SHA is intended to identify. The external registry allows this sequence instead:

1. finalize the document and its relevant dependencies in commit **A**;
2. independently verify the document against **A**;
3. in a later commit **B**, record **A** as `verified_at_commit` in the registry;
4. reject the verification claim when the document or a declared dependency changes after **A**.

The registry also declares `governed_roots`. Every Markdown file under a governed root must have a registry entry. Removing document-local metadata therefore cannot silently remove a document from the control.

## Registry contract

The registry is JSON with `schema_version: 1`, one or more governed roots, and one or more document entries.

Each document entry requires:

- a unique stable `TOS-DOC-*` identifier;
- a unique repository-relative Markdown path;
- an allowed document class;
- an allowed truth state;
- a non-empty list of safe repository-relative dependency paths;
- for `verified` documents, a full 40-character immutable commit SHA in `verified_at_commit`.

Allowed truth states are:

- `verified` — freshness is enforced;
- `declared` — authoritative statement not represented as evidence-verified repository state;
- `planned` — approved/intended future state;
- `proposed` — under consideration.

Allowed classes are:

- `architecture`;
- `audit`;
- `governance`;
- `project-management`;
- `reference`;
- `runbook`;
- `status`.

Unknown states, unknown classes, duplicate IDs, duplicate paths, unsafe paths, missing governed documents, short/unresolvable anchors, non-ancestor anchors, or uncovered Markdown files fail closed.

## Promotion and history-rewrite rule

A verification anchor is valid only on a history that preserves the anchored commit as an ancestor. This creates an explicit promotion requirement for governed verified documents.

A branch-local verification SHA is **candidate evidence**, not automatically a valid canonical-lineage anchor. Squash merges and rebases create new commit identities and can remove the original branch commit from the promoted ancestry even when the resulting file contents are equivalent.

Therefore:

1. before promotion, verify each `verified_at_commit` is an ancestor of the exact promotion candidate;
2. if promotion preserves ancestry with a normal merge commit, an otherwise-current anchor may remain valid;
3. if promotion uses squash, rebase, cherry-pick, history rewriting, or any process that does not preserve the anchor as an ancestor, the promoted result MUST be re-verified on the canonical lineage and the registry re-anchored before that lineage can claim governed-document freshness;
4. a pre-squash or pre-rebase branch SHA MUST NOT be copied forward as a canonical verified anchor merely because equivalent content was promoted;
5. CI failure caused by `DOC_ANCHOR_NOT_ANCESTOR` is an invalid-governance condition to repair, not a check to bypass or downgrade to report-only;
6. any PR that intentionally carries a newly verified branch-local anchor and is expected to finish green without a post-promotion repair must use a promotion method that preserves the anchor ancestry.

This rule protects commit identity as evidence while avoiding the false assumption that content-equivalent squash commits preserve ancestry.

## Freshness semantics

For each `verified` document, `scripts/check-doc-freshness.mjs` verifies that:

1. the target ref resolves to an exact commit;
2. the registry exists at that exact target commit;
3. the anchor is a full commit SHA present in the repository;
4. the anchor is an ancestor of the target commit;
5. the governed document existed at the anchor and exists at the target;
6. declared dependencies existed at the anchor;
7. the governed document itself has not changed since the anchor;
8. none of its declared dependencies have changed since the anchor.

Top-level report status values are:

- `current` — all checked verified documents are current and registry validation succeeded;
- `stale` — at least one verified document or declared dependency changed after its verification anchor;
- `invalid` — registry, coverage, anchor, path, or resolution rules fail.

Per-document status values are:

- `current` — verified prose and dependencies are unchanged since the verification anchor;
- `stale` — the verified document or a declared dependency changed;
- `not_checked` — the document is governed but its truth state is not `verified`.

`not_checked` is never a top-level report status. It is only emitted for individual governed documents that are intentionally outside verified-freshness evaluation.

Normal exit codes are:

- `0` — current, or stale when explicit `--report-only` mode is used;
- `1` — stale verified documentation in enforcing mode;
- `2` — malformed, uncovered, or unresolvable governance data;
- `3` — Git repository/environment failure.

`--report-only` suppresses only the stale enforcement exit (`1` to `0`) so callers can inspect a stale report without failing the process. It does not suppress invalid governance data or Git/environment failures; those remain fail-closed at exit codes `2` and `3` respectively.

JSON mode emits structured output for both success and failure paths. Human-readable mode escapes repository paths and error messages before printing them so legal control characters such as embedded newlines cannot create ambiguous or forged log records.

## Path safety

Dependency entries are literal repository paths, not arbitrary Git pathspec expressions. Absolute paths, parent traversal, `.git` paths, backslashes, colons, pathspec magic, and wildcard syntax are rejected before Git evaluation. Colons are forbidden anywhere in governed repository paths because Git object expressions use the `<commit>:<path>` form and must remain unambiguous. Git commands use literal-pathspec mode where applicable.

This prevents a document from declaring an exclusion, object-expression ambiguity, or other pathspec trick that causes material changes to disappear from freshness evaluation.

## Branch drift doctrine

A branch being behind its base does **not** prove that merging the branch would delete newer base work. Behind/ahead counts are identity and reconciliation signals, not merge-result evidence.

For a behind or diverged branch:

1. identify the merge base;
2. inspect the actual branch patch and base changes;
3. reconcile the branch against the current base;
4. verify the resulting exact candidate;
5. use evidence for that exact candidate only.

Do not infer merge deletion from `git diff base..branch` alone.

## CI doctrine

Pinned historical-date tests are allowed as deterministic regression tests. They do not establish current-date liveness.

Documentation freshness CI is a separate control and must run against the exact pull-request candidate on every supported TOS Node.js version. Current-date canonical fact/requirement/boot liveness remains a separate control boundary tracked independently from document freshness.

A canonical branch that is red solely because its registered verification anchor is not in that branch's ancestry is itself in an invalid governed-document state. New unrelated material work must not normalize that failure; repair the anchor lineage or re-verification first when it blocks exact-candidate evidence.

## Negative controls

The freshness implementation must prove rejection of at least:

- dependency changes after verification;
- governed prose changes after verification;
- silent registry opt-out while the governed Markdown remains;
- duplicate document IDs;
- invalid truth states;
- invalid classes;
- short or malformed anchors;
- non-ancestor anchors;
- unsafe dependency pathspecs, including colon-containing repository paths;
- missing governed documents;
- missing registries;
- malformed CLI value arguments;
- ambiguous human-readable output from newline-containing paths or error messages.

A passing happy-path fixture without these failures is insufficient evidence for adoption.

## Authority boundary

This control does not authorize a model or automation to declare content true, approve its own work, merge a pull request, expand scope, or promote a release. Independent verification and existing owner-reserved actions remain in force.
