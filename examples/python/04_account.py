import json
from reporters_client import request
print(json.dumps(request("/account"), indent=2))
