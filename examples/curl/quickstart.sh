#!/usr/bin/env bash
set -euo pipefail
: "${REPORTERS_API_KEY:?Set REPORTERS_API_KEY in your environment}"
# One bounded search. Deliberately omit --location and --retry.
curl --fail-with-body --silent --show-error --max-time 30 \
  'https://reporters.io/api/v1/reporters/search' \
  -H "Authorization: Bearer ${REPORTERS_API_KEY}" \
  -H 'Accept: application/json' -H 'Content-Type: application/json' \
  --data '{"query":"climate technology","limit":10}'
