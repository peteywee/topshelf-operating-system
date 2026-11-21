# Run a project-file manifest

On Linux with Node 24, pnpm 10, Git and util-linux flock, an operator can authorize a single work order to inventory a directory in a local Git commit. Run the CLI from a trusted TOS checkout. Use a local filesystem with descriptor locks, atomic rename and fsync. Keep the execution account and granted repository under operator control. A caller who can write the operator's private files or run arbitrary code as that Unix user has operator authority.

From the TOS checkout, this example grants one job for its own committed kernel sources. Use a fresh job ID. The repository field must be the canonical absolute worktree root. The order file can come from a separate requester. Review the exact order and source before creating the operator-owned grant.

```bash
set -eu
umask 077
root="$(node -p "require('node:os').userInfo().homedir")/.tos-execution"
install -d -m 700 "$root" "$root/grants"
repo="$(pwd -P)"
commit="$(git rev-parse HEAD)"
job="kernel-inventory-1"
order="$(mktemp)"
node --input-type=module - "$job" "$commit" >"$order" <<'JS'
const [jobId, commit] = process.argv.slice(2);
console.log(JSON.stringify({ jobId, capability: "project-file-manifest", commit, scope: "packages/kernel" }));
JS
node --input-type=module - "$order" "$repo" "$root/grants/$job.json" <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
const [path, repository, grant] = process.argv.slice(2);
writeFileSync(grant, JSON.stringify({ order: JSON.parse(readFileSync(path)), repository }), { flag: "wx", mode: 0o600 });
JS
pnpm tos -- execute manifest "$order"
```

Success returns the JSON manifest path and the SHA-256 digest of its actual bytes. Entries name tracked leaves with their Git modes and object IDs. Symlinks and submodules appear as entries. Their targets are never traversed. The implementation supports SHA-1 Git commit IDs and UTF-8 filenames, limits raw Git listings to 1 MiB and limits manifests to 8 MiB. A scope is a directory beneath the commit, or `.` for the whole tree. Supported directory components begin with an ASCII letter, digit, underscore or hyphen and may also contain dots.

Re-submit the same order to verify its output again or recover after interruption. Under `~/.tos-execution/jobs/<jobId>/`, the accepted order and source are written to `state.json` before execution. The process holds an exclusive job lock until exit. A contender receives `blocked`. A crash releases the lock. Recovery resumes a pending job, verifies a previously published manifest, and refuses to overwrite conflicting output. Success requires a separate Git listing compared with the manifest read back from disk. A missing or changed completed output records `uncertain`. Creation failures record `failed`. Both require inspection and a newly granted job ID for a fresh run.

Missing or mismatched grants produce `blocked` and a `last-denial.json` record. Reusing an accepted ID with different content is blocked. Grant removal prevents subsequent executions and replays. An operation that has already acquired its grant can finish. This human-triggered capability has no scheduler or general command runner.
