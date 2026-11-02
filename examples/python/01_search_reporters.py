import json
import sys
from reporters_client import request
print(json.dumps(request("/reporters/search", method="POST", body={"query": sys.argv[1] if len(sys.argv) > 1 else "climate technology", "limit": 10}), indent=2))
