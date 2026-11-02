import assert from 'node:assert/strict';
const base = 'https://reporters.io/api/v1';
const response = await fetch(base + '/openapi.json', { redirect: 'error', signal: AbortSignal.timeout(20000) });
assert.equal(response.status, 200, 'Public OpenAPI must load');
const spec = await response.json();
for (const [path, method] of [['/account', 'get'], ['/reporters/search', 'post'], ['/outlets/search', 'post'], ['/metadata/search-filters', 'get']]) {
  assert.ok(spec.paths?.[path]?.[method], `Missing public contract operation: ${method} ${path}`);
}
const unauthenticated = await fetch(base + '/account', { redirect: 'error', signal: AbortSignal.timeout(20000) });
assert.equal(unauthenticated.status, 401, 'Account must require an API key');
console.log('Live public contract and missing-key rejection checks passed; no authenticated data requests made.');
