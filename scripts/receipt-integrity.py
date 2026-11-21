"""GitHub Actions adapter for reading a bounded TOS receipt without extracting files."""
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import zipfile

from jsonschema import Draft202012Validator

SCHEMA = Path(__file__).resolve().parents[1] / "schemas/scheduled-manifest-receipt.v1.schema.json"
VALIDATE = Draft202012Validator(json.loads(SCHEMA.read_bytes())).validate
MAX_ZIP = 65536


def require(condition, reason):
    if not condition:
        raise ValueError(reason)


def unique_keys(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate JSON field")
        result[key] = value
    return result


def download(path):
    return subprocess.run(["gh", "api", path], check=True, capture_output=True, timeout=12).stdout


def verify(artifact, expected, api, read, reuse):
    require(not artifact["expired"] and 0 < artifact["size_in_bytes"] <= MAX_ZIP, "expired or oversized artifact")
    origin = artifact["workflow_run"]
    run_id = origin["id"]
    require(origin["head_sha"] == expected["commit"] and origin["head_branch"] == "main", "source mismatch")
    run = json.loads(read(f"{api}/runs/{run_id}"))
    require(run["id"] == run_id and run["head_sha"] == expected["commit"]
            and run["path"] == ".github/workflows/scheduled-manifest.yml"
            and run["head_branch"] == "main" and run["event"] in ("push", "schedule", "workflow_dispatch")
            and run["head_repository"]["full_name"] == os.environ["GITHUB_REPOSITORY"], "wrong producing workflow")
    if reuse:
        require(run["conclusion"] == "success" and run["run_attempt"] == 1, "not an original successful run")
    data = read(f"{api}/artifacts/{artifact['id']}/zip")
    require(len(data) == artifact["size_in_bytes"] and
            "sha256:" + hashlib.sha256(data).hexdigest() == artifact["digest"], "ZIP digest or size mismatch")
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        require(archive.namelist() == ["receipt.json"] and
                archive.infolist()[0].file_size <= 4096, "unexpected ZIP contents")
        saved = json.loads(archive.read("receipt.json").decode("utf-8"), object_pairs_hook=unique_keys)
    VALIDATE(saved)
    require(saved["run"] == str(run_id) and saved["attempt"] == run["run_attempt"], "run or attempt mismatch")
    comparison = dict(expected)
    if reuse:
        comparison.update(run=saved["run"], attempt=saved["attempt"])
    require(saved == comparison, "receipt differs from fresh result")


def record_delivery(action, artifact, summary):
    if summary:
        run_id = artifact["workflow_run"]["id"]
        artifact_id = artifact["id"]
        url = f"https://github.com/{os.environ['GITHUB_REPOSITORY']}/actions/runs/{run_id}/artifacts/{artifact_id}"
        with open(summary, "a", encoding="utf-8") as stream:
            stream.write(f"Receipt {action}: [artifact {artifact_id} from run {run_id}]({url})\n")


def delivery(mode, expected, name, artifact_id, read=download, summary=None):
    api = "repos/" + os.environ["GITHUB_REPOSITORY"] + "/actions"
    if mode == "confirm":
        require(artifact_id.isdecimal(), "upload returned no artifact ID")
        artifact = json.loads(read(f"{api}/artifacts/{artifact_id}"))
        require(str(artifact["id"]) == artifact_id and artifact["name"] == name, "wrong uploaded artifact")
        verify(artifact, expected, api, read, False)
        record_delivery("confirmed", artifact, summary)
        return "confirmed"
    require(mode == "reuse", "unknown delivery mode")
    if expected["result"] != "success" or expected["attempt"] != 1:
        return "publish"
    candidate = "lookup"
    try:
        history = json.loads(read(f"{api}/workflows/scheduled-manifest.yml/runs?branch=main&per_page=5"))
        prior = next((r for r in history["workflow_runs"] if r["id"] < int(expected["run"])), {})
        if prior.get("conclusion") != "success":
            return "publish"
        listing = json.loads(read(f"{api}/artifacts?name={name}&per_page=1"))
        if not listing["artifacts"]:
            return "publish"
        artifact = listing["artifacts"][0]
        candidate = artifact["id"]
        require(artifact["name"] == name, "artifact name mismatch")
        verify(artifact, expected, api, read, True)
        record_delivery("reused", artifact, summary)
        return "reuse"
    except Exception as error:
        print(f"Retained receipt {candidate} unavailable: {type(error).__name__}: {str(error)[:180]}", file=sys.stderr)
        return "publish"


if __name__ == "__main__":
    try:
        receipt = json.loads(Path("receipt.json").read_bytes(), object_pairs_hook=unique_keys)
        VALIDATE(receipt)
        print(delivery(sys.argv[1], receipt, os.environ["NAME"], os.environ.get("ARTIFACT_ID", ""),
                       summary=os.environ.get("GITHUB_STEP_SUMMARY")))
    except Exception as error:
        sys.exit(f"Evidence delivery unconfirmed: {error}")
