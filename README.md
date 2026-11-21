# TopShelf Operating System (TOS)

TOS runs one authorized job end to end. It takes a Git commit and a directory, lists the tracked files at that exact revision, and verifies the saved manifest against a second Git listing. The work order and grant must agree on the job ID, capability, commit and scope. The grant also identifies the local repository.

## What runs unattended

GitHub Actions runs the manifest for `packages/kernel` on pushes to `main` and daily at 11:23 UTC. The workflow also checks the inventory of 105 draft contract templates. A successful run confirms a compact JSON receipt by reading it back, or verifies that an existing receipt covers an equivalent result. Open a run to inspect the result. [Workflow runs](https://github.com/peteywee/topshelf-operating-system/actions/workflows/scheduled-manifest.yml) · [Schedule and receipt policy](docs/implementation/scheduled-manifest.md)

## Run locally

Use Node.js 24 and pnpm 10.33.3. From the repository root, install dependencies and check the build, types and tests.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm tos -- validate
```

To run a manifest on Linux, create a work order and a matching private grant using the [manifest walkthrough](docs/implementation/pinned-manifest.md). Then run `pnpm tos -- execute manifest "$order"` in the same shell. After interruption, submit the identical order again. A competing execution or conflicting job ID is blocked. If completed output is missing or differs, the job records uncertainty.

## Where things live

| Location | Contents |
| --- | --- |
| `packages/cli/`, `packages/kernel/` | Command entry points, execution, output verification and recovery |
| `.tos/` | Canonical project state, facts, requirements, decisions and evidence references |
| `contracts/`, `schemas/` | Draft contract templates and machine-readable definitions |
| `~/.tos-execution/` | Private grants, accepted jobs, local manifests and receipts on the worker |

A fact blocks the actions that depend on it. The manifest grant and the planner have separate prerequisites. [Scoped readiness](docs/implementation/scoped-readiness.md) · [Inventory renewal](docs/implementation/unattended-inventory.md) · [Linux and macOS workspace layout](ops/workspace/README.md)

## Development boundary

Use a short feature branch, open a PR into `rebuild`, then promote the verified rebuild to `main`. [TSAL](https://github.com/peteywee/TSAL) defines the separate automation contracts and evidence checks.

The primary bounded execution proving workflow is planned around `tos execute next`:

That command is reserved for future work selection. Today the scheduler supplies the job and the manifest executor verifies it. Historical foundation exports are available in the [pre-cleanup tree](https://github.com/peteywee/topshelf-operating-system/tree/39b2e066bce401d03dd4c377024dfe5c32b67ff2).
