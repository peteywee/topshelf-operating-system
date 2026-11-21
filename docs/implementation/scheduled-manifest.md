# Hosted manifest and inventory checks

The Scheduled project manifest workflow runs on pushes to main and daily at 11:23 UTC. Run workflow on main also starts it. Each delivery authorizes a manifest for packages/kernel in this repository at the event commit. The dedicated runner builds the separately pinned worker. The candidate checkout supplies data only.

Open the Actions run and download its artifact. The order identifies the commit and scope. The execution result contains the hash of manifest.json. The inventory worker separately verifies the approved contract mapping, then a fresh CLI process evaluates TOS-REQ-002. A blocked check makes the run fail. Partial evidence can be downloaded on failure.

Artifacts are retained for 30 days. Each hosted delivery has a fresh execution account, so reruns verify again and publish separate evidence. The host-local grants and receipts expire with the runner. Disable the workflow to stop future deliveries and cancel any active run to stop it. Change the permitted scope or trusted worker revision through review.
