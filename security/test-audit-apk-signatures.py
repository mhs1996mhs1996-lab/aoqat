#!/usr/bin/env python3
"""Offline adversarial tests for the read-only migration audit."""
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from unittest import TestCase, main
from unittest.mock import patch

tool = Path(__file__).resolve().parent / "audit-apk-signatures.py"
spec = importlib.util.spec_from_file_location("apk_signer_audit", tool)
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class ApkAuditTests(TestCase):
    def test_parse_actual_style_apksigner_output(self):
        sample = (
            "Verifies\n"
            "Signer #1 certificate SHA-256 digest: "
            + audit.OWNER_V2.upper() + "\n"
            "Signer #1 certificate SHA-1 digest: deadbeef\n"
        )
        self.assertEqual(audit.parse_signer_digests(sample), {audit.OWNER_V2})
        self.assertEqual(audit.classify(audit.parse_signer_digests(sample)), "OWNER_V2")

    def test_unknown_and_multiple_signers_fail_closed(self):
        self.assertEqual(audit.classify(set()), "UNKNOWN_OR_MULTIPLE")
        self.assertEqual(audit.classify({"0" * 64}), "UNKNOWN_OR_MULTIPLE")
        self.assertEqual(
            audit.classify({audit.EXPOSED_OLD, audit.OWNER_V2}),
            "UNKNOWN_OR_MULTIPLE"
        )
        self.assertEqual(audit.classify({audit.EXPOSED_OLD}), "EXPOSED_OLD")

    def test_invalid_or_unrecognized_certificate_is_detected(self):
        fake_output = "Signer #1 certificate SHA-256 digest: " + "a" * 64
        with patch.object(audit.subprocess, "run", return_value=SimpleNamespace(
            stdout=fake_output, stderr="", returncode=0
        )) as executor:
            status, fp = audit.inspect("apksigner", Path("/tmp/test.apk"), 28)
        self.assertEqual(status, "UNKNOWN_OR_MULTIPLE")
        self.assertEqual(fp, "a" * 64)
        self.assertEqual(executor.call_args.args[0][6:8], ["--max-sdk-version", "28"])

    def test_failed_signature_is_not_treated_as_valid(self):
        with patch.object(audit.subprocess, "run", return_value=SimpleNamespace(
            stdout="", stderr="DOES NOT VERIFY", returncode=1
        )):
            status, _ = audit.inspect("apksigner", Path("/tmp/test.apk"), 33)
        self.assertEqual(status, "VERIFICATION_FAILED")


if __name__ == "__main__":
    main()
