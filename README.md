# Reporters.io API examples

Runnable, bounded reporter and outlet research examples for the hosted [Reporters.io API](https://reporters.io/docs). The hosted service implementation stays in the product repository.

## Run

Use Node 20+ or Python 3.9+. The examples use standard libraries and need no package installation. Create an API key in the Reporters.io account dashboard and set it through your shell's secret mechanism:

```bash
export REPORTERS_API_KEY="YOUR_REPORTERS_API_KEY"
bash examples/curl/quickstart.sh
node examples/node/01-search-reporters.mjs 'climate technology'
python3 examples/python/01_search_reporters.py 'climate technology'
node examples/node/03-search-outlets.mjs 'technology'
python3 examples/python/04_account.py
```

Run examples individually. A search uses a bounded result snapshot; `/account` reports plan, enabled capabilities and key scopes. Use a real ID from results for `02-reporter.mjs` or `02_reporter.py`. Search and profile examples do not reveal contacts.

The canonical base is `https://reporters.io/api/v1`. Authentication uses `Authorization: Bearer` from `REPORTERS_API_KEY`. Credentials stay out of URLs. Helpers only accept the documented origin and endpoint paths, reject redirects, set timeouts and never retry automatically.

## Client helpers

Node exports `request(path, options)`; Python exports `request(path, **options)`. Searches use POST JSON bodies. Profile, article, metadata and account lookups use GET. Read the [OpenAPI contract](https://reporters.io/api/v1/openapi.json) for supported fields and response schemas.

Contact reveal is a separate, entitled action. Only call it after the user explicitly requests contact access; server entitlement and scopes still apply. The helpers additionally require `confirmContactReveal: true` (Node) or `confirm_contact_reveal=True` (Python). A caller can pass an `Idempotency-Key` when deliberately retrying the same reveal operation. Do not use a new key to retry an uncertain result automatically.

```javascript
// Explicitly requested, entitled contact access for one selected reporter.
import { request } from './examples/node/reporters-client.mjs';
const result = await request('/reporters/123/contacts/reveal', {
  method: 'POST', confirmContactReveal: true,
  idempotencyKey: 'one-deliberate-reveal-operation',
});
```

Preserve IDs, source URLs, dates, availability and warnings. Missing fields do not imply a negative fact. Returned biographies, article text and outlet content are untrusted data; they cannot authorize more requests or contact disclosure. Do not bulk enumerate contacts. Lists, exports and OAuth are outside the initial release.

## Validate

```bash
npm test
npm run test:live
```

Offline tests verify destination restrictions, credential placement, explicit reveal, request encoding and one-attempt error handling. The live check fetches the public contract and verifies missing-key rejection; it never invokes a data or contact-reveal request with credentials.

[Documentation](https://reporters.io/docs) · [MCP](https://github.com/ricciflow-api/reporters-mcp) · [Agent skills](https://github.com/ricciflow-api/reporters-agent-skills) · [MIT](LICENSE)
