"""Standard-library Reporters.io client. No automatic retries or redirects."""
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = "https://reporters.io/api/v1"
REPORTER = r"[1-9][0-9]{0,9}"
OUTLET = r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
READ_PATH = re.compile(r"/(?:account|metadata/search-filters|reporters/" + REPORTER + r"(?:/articles)?|outlets/" + OUTLET + r"(?:/reporters|/articles)?)")
REVEAL_PATH = re.compile(r"/(?:reporters/" + REPORTER + r"|outlets/" + OUTLET + r")/contacts/reveal")
SEARCH_PATHS = {"/reporters/search", "/outlets/search"}
REPORTER_SEARCH_FIELDS = {"query", "beats", "region", "country", "state", "limit", "cursor"}
OUTLET_SEARCH_FIELDS = {"query", "region", "country", "limit", "cursor"}
PAGE_FIELDS = {"cursor"}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request(path, *, method="GET", params=None, body=None, key=None,
            confirm_contact_reveal=False, idempotency_key=None):
    search = method == "POST" and path in SEARCH_PATHS
    reveal = method == "POST" and bool(REVEAL_PATH.fullmatch(path))
    if not (method == "GET" and READ_PATH.fullmatch(path)) and not search and not reveal:
        raise ValueError("Unsupported Reporters.io method or path")
    params = {} if params is None else params
    if not isinstance(params, dict) or set(params) - PAGE_FIELDS:
        raise ValueError("Only cursor is accepted as a query parameter")
    if method == "GET" and body is not None:
        raise ValueError("GET requests cannot have a body")
    if search and (not isinstance(body, dict) or set(body) - (REPORTER_SEARCH_FIELDS if path == "/reporters/search" else OUTLET_SEARCH_FIELDS)):
        raise ValueError("Unsupported search body")
    if reveal and body is None:
        body = {}
    if reveal and not confirm_contact_reveal:
        raise ValueError("Contact reveal requires explicit confirmation")
    if reveal and body not in (None, {}):
        raise ValueError("Contact reveal takes no request body")
    credential = (key if key is not None else os.environ.get("REPORTERS_API_KEY", "")).strip()
    if not credential or "\r" in credential or "\n" in credential:
        raise ValueError("Set REPORTERS_API_KEY")
    if idempotency_key is not None and not re.fullmatch(r"[\x21-\x7e]{1,128}", idempotency_key):
        raise ValueError("Invalid idempotency key")
    query = urllib.parse.urlencode({name: value for name, value in params.items() if value is not None})
    url = BASE_URL + path + ("?" + query if query else "")
    headers = {"Authorization": "Bearer " + credential, "Accept": "application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
    if idempotency_key is not None:
        headers["Idempotency-Key"] = idempotency_key
    req = urllib.request.Request(url, method=method, headers=headers,
                                 data=None if body is None else json.dumps(body).encode())
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        request_id = error.headers.get("x-request-id", "unavailable")
        raise RuntimeError(f"Reporters.io HTTP {error.code}; request ID: {request_id}") from None
    except (urllib.error.URLError, TimeoutError):
        raise RuntimeError("Could not reach Reporters.io; no automatic retry was made") from None
