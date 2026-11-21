# Scope fact failures to dependent work

Use Node 24 and pnpm 10 from the TOS checkout. The following commands read the canonical requirements from `.tos/requirements.yaml`.

| Command | Decision |
|---|---|
| `pnpm tos -- requirement ready TOS-REQ-001` | Evaluates that active requirement's declared prerequisites today. A blocked decision exits nonzero and identifies the failing fact when its identity is known. |
| `pnpm tos -- boot ready TOS-REQ-001` | Also checks the shared boot record, authority, module decisions and blocking intake questions. |
| `pnpm tos -- requirement health` | Reports the catalog and affected requirements as JSON. Degraded health exits nonzero. |
| `pnpm tos -- boot validate` | Checks the complete human-assisted plan. It still fails when a prerequisite for that full plan is unavailable. |
| `pnpm tos -- contract validate` | Reads the current inventory even if its prior evidence has expired or the inventory changed. |
| `pnpm tos -- execute manifest order.json` | Rechecks the operator's exact grant for this independent read-only capability on each submission or recovery. |

The contract-change guard selects `TOS-REQ-002` for changes to contract templates, the contract register, or the catalog validator. It evaluates scoped boot and the existing authorization checks. The CLI's requirement ID is a diagnostic selector. A requester cannot select a different requirement for this promotion, add exemptions to a manifest order, or use a historical date at either live readiness entry point.

The full health audit runs daily at 11:17 UTC on the default branch and supports manual dispatch. The job reports individual facts, affected requirements, and full boot readiness. Its result is separate from the pull-request workflow. PR checks use frozen historical project data with the current CLI for pinned-date regressions and exercise scoped admission against a copy of the candidate.

The first supported work order inventories a granted Git snapshot. Adding a capability that consumes a fact requires binding its prerequisite in the trusted executor or promotion path before dispatch. A readiness result alone grants no permission.

### Renew the contract inventory evidence

TOS-FACT-002 compares the current register, contract YAML paths and bytes, catalog validator source and pnpm lockfile with the Git commit recorded in its freshness policy. Git history containing that commit must be available. The verifier reads the working tree, including untracked template files. An unrelated change preserves the evidence. The initial binding uses TOS-EVD-012, which already verified the inventory at that commit. The snapshot reader checks whether those verified inputs still match.

For a standing grant on one execution host, see [Unattended inventory renewal](unattended-inventory.md). The following procedure updates portable repository evidence.

After an inventory change, commit the new inputs. From a clean checkout of that revision, run the following checks with the project dependencies installed.

```sh
set -eu
test -z "$(git status --porcelain --untracked-files=all)"
git rev-parse HEAD
pnpm tos -- contract validate
python3 - <<'PY'
import csv
import pathlib
import subprocess

with open("registers/contract-register.csv", newline="") as register:
    rows = list(csv.DictReader(register))
paths = {r["template_path"] for r in rows}
tracked = subprocess.check_output(["git", "ls-files", "-z", "contracts"]).decode().split("\0")
templates = {p for p in tracked if pathlib.PurePosixPath(p).suffix.lower() in {".yaml", ".yml"}}
assert len(rows) == len(paths) == len({r["contract_id"] for r in rows}) == 105
assert all(r["contract_name"].strip() for r in rows) and paths == templates
print("Verified 105 distinct named entries and all tracked template paths")
PY
```

In a follow-up commit, append the result to `.tos/evidence-index.yaml` using a new evidence ID with `fact_id: TOS-FACT-002`, the exact `statement` and `observed_state` being certified, class `automated`, status `verified`, the source commands, the observation date and the full input commit SHA. Update the fact's register and automated-validation references, dates, `last_verified`, and `freshness.commit_sha` to the new evidence. Confirm with `pnpm tos -- requirement ready TOS-REQ-002`. If the count itself changed, the old claim is false. Reconcile its wording, verifier expectation and governing requirement before recording a different count.
