import json
import sys
from reporters_client import request
if len(sys.argv) != 2:
    raise SystemExit("Pass a reporter ID from search results")
print(json.dumps(request("/reporters/" + sys.argv[1]), indent=2))
