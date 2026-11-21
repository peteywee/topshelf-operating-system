# TopShelf workspace

Create one place to browse TOS and TSAL on a Linux or macOS development machine. From your TOS checkout, pass the path to your TSAL checkout:

```sh
node ops/workspace/init.mjs ../TSAL
```

This creates ~/topshelf with ordinary symbolic links. To choose another location, supply a second argument in an existing trusted parent directory. Existing workspace directories must be owned by your account and writable only by that account. Running the command again checks and reuses the same links. Setup checks for conflicting files and links before it creates directories. Links point to the existing checkouts, so an edit through a link edits the original file.

| Workspace path | Contents and owner |
| --- | --- |
| src/tos | TOS checkout. Put runtime code under packages, operational helpers under ops, and tests beside the component they cover. |
| src/tsal | Independent TSAL checkout. Its schemas, tooling, and tests stay versioned together. |
| etc/tos | The TOS checkout’s .tos directory. Holds project facts, decisions, requirements, and the evidence index. |
| etc/tsal.project.json | The TSAL project configuration in its checkout. |
| share/tos and share/tsal | Documentation from the two checkouts. |
| var/tos | The operator’s ~/.tos-execution directory. It holds grants, job state, manifests, and inventory receipts. This link becomes usable when local execution state exists. |

Use the canonical checkout path when configuring a worker or granting authority. The workspace is a navigation aid. Creating it grants no permissions and starts no services. Its links work on macOS; the existing local execution worker requires Linux. GitHub Actions continues to own its runner-local state. Hosted receipts remain attached to Actions runs and the historical ZIP stays on the manifest-evidence-archive branch.

Keep new files with their owner. A new executor and its tests belong under src/tos/packages. A receipt schema belongs under src/tos/schemas. A new run produces state under var/tos on the executing host. A retained hosted receipt belongs to its Actions run. This keeps one authoritative copy of each item.
