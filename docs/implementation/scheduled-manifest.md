# Hosted manifest and inventory checks

The Scheduled project manifest workflow runs on pushes to main and daily at 11:23 UTC. Run workflow on main also starts it. Each delivery authorizes a manifest for packages/kernel in this repository at the event commit. The dedicated runner builds the separately pinned worker. The candidate checkout supplies data only.

Each completed check writes a compact receipt conforming to [the v1 JSON Schema](../../schemas/scheduled-manifest-receipt.v1.schema.json). It identifies the source commit, verified scope, pinned worker, Actions run and attempt. The manifest digest identifies the verified output. Inventory success means the approved mapping passed validation. Readiness success means a separate process accepted TOS-REQ-002. On failure the three step outcomes identify where to inspect the run log. A cancelled run may have only its Actions status.

Actions retains receipts for 30 days. An ordinary success can reuse an unexpired equivalent receipt after a previous successful run. Failures, recoveries, explicit reruns, and unavailable lookup results publish their own receipt. Concurrent runs may each retain a receipt. Each execution still rechecks the data. The original five-file ZIP and checksum are on the manifest-evidence-archive branch under archive/manifest. Disable the workflow to stop future deliveries.

Before reuse the pinned reader checks the ZIP against the Actions digest, validates receipt.json against the v1 schema, checks the producing workflow, run and attempt, and compares every outcome with the fresh check. Damage or an unavailable old receipt causes a fresh upload. A fresh upload must pass the same checks against its own artifact ID and current run. Unconfirmed delivery fails the job. A rerun provides new evidence under its own attempt. Historical evidence remains uncertain if the original bytes cannot be verified.

A successful delivery links the exact confirmed or reused artifact in the consuming run’s summary. The link follows the existing artifact retention window.
