import importlib.util
import io
import json
import pathlib
import sys
import unittest
from unittest.mock import MagicMock, patch

HERE = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE / "examples/python"))
import reporters_client as client
spec = importlib.util.spec_from_file_location("pagination", HERE / "examples/python/05_pagination.py")
pagination = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pagination)


class ClientTests(unittest.TestCase):
    def test_destinations_and_query_credentials_rejected(self):
        for path in ["https://evil.example", "//evil.example", "/reporters/1/../account", "/api/admin"]:
            with self.assertRaises(ValueError):
                client.request(path, key="fixture-key")
        with self.assertRaises(ValueError):
            client.request("/account", key="fixture-key", params={"api_key": "secret"})

    def test_post_credentials_and_no_redirect(self):
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value = io.BytesIO(b'{"data":{"items":[]}}')
        with patch("urllib.request.build_opener", return_value=opener):
            client.request("/reporters/search", method="POST", key="fixture-key", body={"query": "climate & technology", "limit": 10})
        req = opener.open.call_args.args[0]
        self.assertEqual(req.full_url, "https://reporters.io/api/v1/reporters/search")
        self.assertEqual(req.get_header("Authorization"), "Bearer fixture-key")
        self.assertEqual(json.loads(req.data), {"query": "climate & technology", "limit": 10})
        self.assertIsNone(client.NoRedirect().redirect_request(None, None, 302, "", {}, "https://evil.example"))

    def test_reveal_requires_confirmation(self):
        with self.assertRaisesRegex(ValueError, "explicit confirmation"):
            client.request("/reporters/123/contacts/reveal", method="POST", key="fixture-key")
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value = io.BytesIO(b'{"data":{}}')
        with patch("urllib.request.build_opener", return_value=opener):
            client.request("/reporters/123/contacts/reveal", method="POST", key="fixture-key", confirm_contact_reveal=True, idempotency_key="one-reveal")
        req = opener.open.call_args.args[0]
        self.assertEqual(req.data, b"{}")
        self.assertEqual(req.get_header("Idempotency-key"), "one-reveal")

    def test_pagination_stops_on_repeated_ids(self):
        calls = []
        def request(path, **kwargs):
            calls.append(kwargs["body"])
            return {"data": {"items": [{"id": "123"}], "has_more": True, "next_cursor": "cursor"}}
        self.assertEqual(len(pagination.collect_reporters("climate", max_pages=5, request_impl=request)), 1)
        self.assertEqual(calls, [{"query": "climate", "limit": 10}, {"query": "climate", "limit": 10, "cursor": "cursor"}])


if __name__ == "__main__":
    unittest.main()
