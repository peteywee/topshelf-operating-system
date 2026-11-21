#!/bin/sh
# Trusted, read-only worker entry point. Operator grant management is a separate command.
set -eu
case "${1-}:$#" in run:2|watch:2|watch:3) ;; *) echo "Usage: inventory-renew-worker.sh {run|watch} repository [watch-interval-ms]" >&2; exit 2 ;; esac

script_dir=$(dirname "$(realpath -e -- "$0")")
node_bin=$(realpath -e -- "$(command -v node)")
operator_home=$("$node_bin" -p "require('node:os').userInfo().homedir")
receipts="$operator_home/.tos-execution/inventory/receipts"
target=$(realpath -e -- "$2")
if [ "$(realpath -e -- "$receipts")" != "$receipts" ] || [ ! -d "$receipts" ]; then
  echo "Grant setup must create a canonical receipts directory" >&2
  exit 1
fi
case "$target/" in "$receipts/"*|/run/*) echo "Source overlaps writable worker storage" >&2; exit 1 ;; esac
case "$receipts/" in "$target/"*) echo "Writable receipts are inside the source" >&2; exit 1 ;; esac
case "$script_dir/" in "$receipts/"*|/run/*) echo "Trusted installation overlaps writable storage" >&2; exit 1 ;; esac

if [ "$#" -eq 3 ]; then set -- "$1" "$target" "$3"; else set -- "$1" "$target"; fi

# Hide host control sockets, deny network access, and limit durable writes to receipts.
# Disposable scratch under /run keeps repositories and fixtures under /tmp visible.
exec /usr/bin/unshare --user --map-current-user --net -- /usr/bin/bwrap --unshare-all --share-net --die-with-parent --new-session --cap-drop ALL \
  --ro-bind / / --dev /dev --proc /proc --tmpfs /run --dir /run/tos \
  --bind "$receipts" "$receipts" --chdir "$script_dir" --setenv TMPDIR /run/tos \
  --unsetenv SSH_AUTH_SOCK --unsetenv DBUS_SESSION_BUS_ADDRESS \
  -- "$node_bin" "$script_dir/inventory-renew.mjs" "$@"
