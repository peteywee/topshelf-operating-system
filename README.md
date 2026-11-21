# Historical archive · TOS manifest evidence

This branch preserves the original five-file evidence ZIP from GitHub Actions run **44885562740**, attempt **1**. Use it to inspect or verify that historical delivery. The current worker publishes new receipts to its own Actions runs.

[Original evidence ZIP](archive/manifest/44885562740-1.zip) · [SHA-256 checksum](archive/manifest/SHA256SUMS) · [Tagged evidence snapshot](https://github.com/peteywee/topshelf-operating-system/tree/db5d97078d32bfc28485c0a92f1ff4e21c827ce3/archive/manifest)

To verify the ZIP from the root of this branch on Linux:

```sh
(cd archive/manifest && sha256sum -c SHA256SUMS)
```

## Current system

For the working software, start at [main](https://github.com/peteywee/topshelf-operating-system/tree/main). Development changes go through [rebuild](https://github.com/peteywee/topshelf-operating-system/tree/rebuild). The [hosted manifest guide](https://github.com/peteywee/topshelf-operating-system/blob/main/docs/implementation/scheduled-manifest.md) explains how to find current receipts and how the worker verifies delivery.
