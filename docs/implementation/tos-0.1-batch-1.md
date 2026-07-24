# TOS 0.1 — Batch 1: Repository Kernel

**Status:** implementation in progress  
**Branch:** `agent/tos-0-1-batch-1-kernel`  
**Owner:** Patrick Craven  
**Purpose:** Establish the minimum executable substrate for TopShelf Operating System without implementing later subsystems prematurely.

## In scope

1. pnpm and TypeScript workspace.
2. Shared canonical types.
3. Kernel package for `.tos/` discovery, loading, and validation.
4. CLI package with `status`, `validate`, version, and help commands.
5. Canonical `.tos/` records for TOS itself.
6. Unit tests for state discovery and required project identity.
7. GitHub Actions validation.

## Explicitly out of scope

- Interactive intake.
- Repository fact detectors.
- Truth reconciliation.
- Module installation or removal.
- Task scheduling and work leases.
- Agent execution.
- Evidence capture automation.
- Promotion, rollback, recovery, or provider adapters.

These are later batches and must not be implied complete by this work.

## Acceptance criteria

- `corepack enable` succeeds under Node.js 20.
- `pnpm install` succeeds from a clean checkout.
- `pnpm check` succeeds.
- `pnpm tos -- --version` returns `0.1.0`.
- `pnpm tos -- status` identifies `peteywee/topshelf-operating-system` and reports zero missing records.
- `pnpm tos -- validate` returns `OK: canonical TOS state is valid.`
- Removing or renaming one required `.tos/` record makes validation fail.
- Removing a required project identity field makes the kernel unit test fail until the defect is corrected.
- CI runs the same build, test, status, and validation paths.

## Validation commands

```bash
corepack enable
pnpm install
pnpm check
pnpm tos -- --version
pnpm tos -- status
pnpm tos -- validate
```

## Evidence required before merge

Record the exact commit SHA and outputs for:

1. Dependency installation.
2. Build.
3. Unit tests.
4. `tos status`.
5. `tos validate`.
6. One negative-control run proving a missing state record is detected.

Update `.tos/evidence-index.yaml` and close `TOS-BLK-001` only after the evidence exists.

## Definition of done

Batch 1 is complete only when the branch is reviewed, all acceptance criteria pass at one exact SHA, CI passes, canonical evidence is updated, and the PR is merged. Creation of the files alone is not completion.

## Next batch

TOS 0.1 Batch 2 will implement the contract registry loader and semantic contract validation against the existing 105-contract catalog. It must build on this kernel rather than introduce a separate state or validation path.
