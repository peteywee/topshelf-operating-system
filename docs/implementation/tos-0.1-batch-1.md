# TOS 0.1 — Batch 1: Repository Kernel

**Status:** validation in progress  
**Branch:** `agent/tos-0-1-batch-1-kernel`  
**Owner:** Patrick Craven  
**Purpose:** Establish the minimum executable substrate for TopShelf Operating System without implementing later subsystems prematurely.

## In scope

1. pnpm and TypeScript workspace.
2. Shared canonical types.
3. Kernel package for `.tos/` discovery, loading, and validation.
4. CLI package with `status`, `validate`, version, and help commands.
5. Canonical `.tos/` records for TOS itself.
6. Unit tests for state discovery, required project identity, missing-state detection, and CLI argument forwarding.
7. GitHub Actions validation on Node.js 20 and 22.
8. Committed pnpm lockfile for reproducible installation.

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

- `corepack enable` succeeds under Node.js 20 or 22.
- `pnpm install` succeeds from a clean checkout.
- `pnpm-lock.yaml` is committed.
- `pnpm check` succeeds.
- `pnpm tos -- --version` returns `0.1.0`.
- `pnpm tos -- status` identifies `peteywee/topshelf-operating-system` and reports zero missing records.
- `pnpm tos -- validate` returns `OK: canonical TOS state is valid.`
- Removing or renaming one required `.tos/` record makes validation fail.
- Removing a required project identity field makes the kernel unit test fail until the defect is corrected.
- CLI tests prove direct arguments and package-manager `--` separators resolve correctly.
- CI runs the same build, typecheck, test, status, and validation paths on Node.js 20 and 22.

## Validation commands

```bash
corepack enable
pnpm install
pnpm check
pnpm tos -- --version
pnpm tos -- status
pnpm tos -- validate
git status --short
git rev-parse HEAD
```

## Evidence required before merge

Record the exact commit SHA and outputs for:

1. Dependency installation.
2. Build and typecheck.
3. Unit tests.
4. `tos --version`.
5. `tos status`.
6. `tos validate`.
7. One negative-control run proving a missing state record is detected.
8. CI on Node.js 20 and Node.js 22.
9. Clean working tree with the lockfile committed.

Update `.tos/evidence-index.yaml` and close `TOS-BLK-001` only after the evidence exists.

## Validation history

### Initial local run — SHA `17dfc1c0472618df916320197aef585e83e9a6ec`

- Environment: Node.js `22.22.3`, pnpm `10.33.3`.
- All three workspace packages built successfully.
- All five kernel tests passed.
- CLI commands failed before execution because the root wrapper passed `--silent` into recursive TypeScript builds.
- The run generated an uncommitted `pnpm-lock.yaml`.
- Disposition: partial evidence only; defects corrected on the branch and exact-SHA rerun required.

## Definition of done

Batch 1 is complete only when the branch is reviewed, all acceptance criteria pass at one exact SHA, CI passes, canonical evidence is updated, `TOS-BLK-001` is closed, and the PR is merged. Creation of the files alone is not completion.

## Next batch

TOS 0.1 Batch 2 will implement the contract registry loader and semantic contract validation against the existing 105-contract catalog. It must build on this kernel rather than introduce a separate state or validation path.
