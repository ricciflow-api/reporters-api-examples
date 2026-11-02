"""Collect at most two pages, keeping the same signed search snapshot."""
import json
import sys
from reporters_client import request


def collect_reporters(query, *, max_pages=2, request_impl=request):
    if not isinstance(max_pages, int) or isinstance(max_pages, bool) or not 1 <= max_pages <= 10:
        raise ValueError("max_pages must be 1–10")
    filters = {"query": query, "limit": 10}
    items, ids, cursors = [], set(), set()
    cursor = None
    for _ in range(max_pages):
        result = request_impl("/reporters/search", method="POST", body={**filters, **({"cursor": cursor} if cursor else {})})["data"]
        page = result.get("items", [])
        if not page:
            break
        added = 0
        for item in page:
            reporter_id = item.get("id")
            if reporter_id is None or str(reporter_id) in ids:
                continue
            ids.add(str(reporter_id))
            items.append(item)
            added += 1
        next_cursor = result.get("next_cursor")
        if not added or not result.get("has_more") or not next_cursor or next_cursor in cursors:
            break
        cursor = next_cursor
        cursors.add(cursor)
    return items


if __name__ == "__main__":
    print(json.dumps(collect_reporters(sys.argv[1] if len(sys.argv) > 1 else "climate technology"), indent=2))
