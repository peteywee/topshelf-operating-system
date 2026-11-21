# Unattended inventory renewal

The operator grants one execution host permission to renew one claim about one local repository. The approved inventory contains 105 named contract IDs with their registered paths. Each candidate must preserve that mapping and pass the approved structural validator. Renewal does not approve edits to the contents of a contract. The contract-change authorization gate still applies.

## Acceptance argument

If a routine change is within the standing grant and can be checked against fixed evidence, requiring an owner action to make the check effective leaves an operational dependency on the owner. For this claim, the evidence of independence is observable: a real delivery discovers the revision, the trusted worker checks it, and an independent readiness process consumes the committed result. A wrong result, duplicate effective receipt, unauthorized write, or failure to recover falsifies the claim for the tested path.

Discrepancies retain the prior evidence and block decisions that depend on the changed inventory. The authority to decide whether a new contract mapping is acceptable remains with the existing contract-change process.

## One-time setup

Use a trusted Linux host with Node 24, pnpm 10, Git, bubblewrap at `/usr/bin/bwrap`, and a systemd user manager. Start in a full checkout containing the reviewed worker revision. The example uses this checkout as the target and makes a separately pinned installation of the verifier. The target and installation must be outside the writable receipt directory. Choose a host whose user manager runs for the intended operating hours.

```sh
set -eu
target=$(git rev-parse --show-toplevel)
target=$(realpath "$target")
worker="$HOME/.local/lib/tos-inventory"
revision=$(git -C "$target" rev-parse HEAD)
mkdir -p "$HOME/.local/lib" "$HOME/.config/systemd/user"
git -C "$target" worktree add --detach "$worker" "$revision"
(cd "$worker" && pnpm install --frozen-lockfile && pnpm build)
install -d "$worker/bin"
ln -s "$(realpath "$(command -v node)")" "$worker/bin/node"

# This is the approved baseline and evidence ID in the scoped-readiness milestone.
node "$worker/scripts/inventory-renew.mjs" grant "$target" 1f7431860c6614ae73b7c3302debe31db8f39c6d TOS-EVD-012
install -m 0644 "$worker"/ops/systemd/tos-inventory@.* "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
timer=$(systemd-escape --path --template=tos-inventory@.timer "$target")
systemctl --user enable --now "$timer"
systemctl --user list-timers "$timer"
```

The timer invokes the read-only worker. Bubblewrap makes the target, trusted installation and operator grant read-only in the worker process. It gives the worker disposable scratch, a network namespace, and write access to the private receipt directory. The launcher stops if it cannot establish that confinement. Use the installed verifier and a trusted local filesystem.

## Observe and revoke

From the same target checkout and operator account:

```sh
set -eu
target=$(realpath "$(git rev-parse --show-toplevel)")
worker="$HOME/.local/lib/tos-inventory"
node "$worker/scripts/inventory-renew.mjs" report "$target"
(cd "$target" && node "$worker/packages/cli/dist/index.js" requirement ready TOS-REQ-002)
service=$(systemd-escape --path --template=tos-inventory@.service "$target")
journalctl --user -u "$service" -n 20 --no-pager
```

A discrepancy retains the history, identifies what failed, and leaves dependent work blocked. The service journal also records delivery failures when the ledger cannot be updated. The operator can revoke the standing grant independently of the timer:

```sh
node "$worker/scripts/inventory-renew.mjs" revoke "$target"
timer=$(systemd-escape --path --template=tos-inventory@.timer "$target")
systemctl --user disable --now "$timer"
```

Normal readiness on this host checks the active authority and actual inventory bytes. A clean hosted CI runner, another checkout path, or another operator account does not inherit the local receipt. Cross-host promotion still uses the repository evidence procedure in [scoped readiness](scoped-readiness.md). A failure in another governing fact can also block the requirement independently.

## Reproduce the trial

Build the checkout and run `node --test scripts/inventory-renew.test.mjs`. The trial uses a temporary operator home and test repository. It exercises a running periodic trigger, fresh-process readiness, redelivery and interrupted receipt publication without granting authority on the real target.
