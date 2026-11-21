"""Fault injection at the Actions API boundary using real receipt and ZIP bytes."""
import importlib.util
import hashlib
import io
import json
import os
from pathlib import Path
import unittest
import zipfile

spec = importlib.util.spec_from_file_location("integrity", Path(__file__).with_name("receipt-integrity.py"))
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ReceiptChaos(unittest.TestCase):
    def setUp(self):
        self.repo = os.environ["GITHUB_REPOSITORY"] = "peteywee/topshelf-operating-system"
        self.current = dict(v=1, commit="a"*40, verifier="b"*40, scope="packages/kernel",
                            run="102", attempt=1, result="success", manifest="success",
                            inventory="success", readiness="success", sha256="c"*64)
        self.saved = dict(self.current, run="101")
        self.run = dict(id=101, head_sha=self.current["commit"], run_attempt=1, conclusion="success",
                        event="schedule", head_branch="main", path=".github/workflows/scheduled-manifest.yml",
                        head_repository={"full_name": self.repo})
        self.art = dict(id=7, name="receipt-key", expired=False, workflow_run=dict(
            id=101, head_sha=self.current["commit"], head_branch="main"))
        self.prior = "success"
        self.pack(json.dumps(self.saved).encode())

    def pack(self, data):
        out = io.BytesIO()
        with zipfile.ZipFile(out, "w") as archive:
            archive.writestr("receipt.json", data)
        self.data = out.getvalue()
        self.art.update(size_in_bytes=len(self.data), digest="sha256:"+hashlib.sha256(self.data).hexdigest())

    def api(self, path):
        route = path.split("/actions/")[1]
        if route == "artifacts/7/zip":
            return self.data
        if route.startswith("workflows/"):
            value = {"workflow_runs": [{"id": 101, "conclusion": self.prior}]}
        elif route.startswith("artifacts?"):
            value = {"artifacts": [self.art]}
        elif route == "artifacts/7":
            value = self.art
        elif route == "runs/" + str(self.run["id"]):
            value = self.run
        else:
            raise AssertionError(path)
        return json.dumps(value).encode()

    def decision(self, mode="reuse", aid="7"):
        return worker.delivery(mode, self.current, "receipt-key", aid, self.api)

    def test_healthy_duplicate(self):
        self.assertEqual(self.decision(), "reuse")

    def test_corrupt_zip_with_original_metadata(self):
        self.data = self.data[:-1] + bytes([self.data[-1] ^ 1])
        self.assertEqual(self.decision(), "publish")

    def test_corrupt_receipts_with_matching_archive_digest(self):
        faults = {"truncated JSON": b'{"v":', "valid JSON with missing field": json.dumps(
            {k:v for k,v in self.saved.items() if k != "v"}).encode(),
            "duplicate key": json.dumps(self.saved).replace('"v": 1','"v": 2, "v": 1').encode()}
        for field,value in [("sha256","d"*64),("run","999"),("attempt",2),("readiness","failure")]:
            faults[field] = json.dumps(dict(self.saved, **{field:value})).encode()
        for label,data in faults.items():
            with self.subTest(label=label):
                self.pack(data)
                self.assertEqual(self.decision(), "publish")

    def test_wrong_workflow_and_expired_artifact(self):
        self.run["path"] = ".github/workflows/other.yml"
        self.assertEqual(self.decision(), "publish")
        self.art["expired"] = True
        self.assertEqual(self.decision(), "publish")

    def test_recovery_and_lookup_outage(self):
        self.prior = "failure"
        self.assertEqual(self.decision(), "publish")
        def unavailable(path):
            raise TimeoutError("injected outage")
        self.assertEqual(worker.delivery("reuse",self.current,"receipt-key","",unavailable),"publish")
        with self.assertRaises(TimeoutError):
            worker.delivery("confirm",self.current,"receipt-key","7",unavailable)

    def test_replacement_requires_its_own_readback(self):
        self.pack(b"truncated")
        self.assertEqual(self.decision(), "publish")
        with self.assertRaises(ValueError):
            self.decision("confirm", "")
        self.art["workflow_run"]["id"] = self.run["id"] = 102
        with self.assertRaises(ValueError):
            self.decision("confirm")
        self.pack(json.dumps(self.current).encode())
        self.assertEqual(self.decision("confirm"), "confirmed")


if __name__ == "__main__":
    unittest.main(verbosity=2)
