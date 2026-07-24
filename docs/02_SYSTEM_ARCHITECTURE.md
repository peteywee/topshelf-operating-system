# System Architecture

TOS consists of a stable kernel, executable runtime, versioned modules, provider adapters, project instances, and a human authority layer.

## Kernel

Owns schemas, controlled vocabulary, state machines, policy evaluation, contract registration, compatibility rules, and validation primitives.

## Runtime

Owns the CLI, repository inspection, interactive intake, truth resolution, scheduler, work-order compiler, task leases, evidence capture, promotion control, recovery, upgrade, and lesson propagation.

## Canonical state

`.tos/project.yaml`, `.tos/facts.yaml`, `.tos/modules.yaml`, `.tos/task-graph.yaml`, `.tos/decisions.yaml`, `.tos/blockers.yaml`, `.tos/claims.yaml`, `.tos/evidence-index.yaml`, `.tos/promotions.yaml`, and `.tos/activity.jsonl` are canonical. SQLite is a derived local index and may be rebuilt.

## Implementation baseline

Use a pnpm TypeScript monorepo on Node.js 20 or later. Core packages: kernel, contracts, runtime, inspectors, scheduler, work-orders, evidence, promotion, recovery, module SDK, adapter SDK, and CLI. Providers remain outside the kernel.
