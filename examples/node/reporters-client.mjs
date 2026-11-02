/** Standard-library Reporters.io client. No redirects or automatic retries. */
const origin = 'https://reporters.io';
const basePath = '/api/v1';
const reporter = String.raw`[1-9][0-9]{0,9}`;
const outlet = String.raw`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`;
const readPath = new RegExp(`^/(?:account|metadata/search-filters|reporters/${reporter}(?:/articles)?|outlets/${outlet}(?:/reporters|/articles)?)$`);
const revealPath = new RegExp(`^/(?:reporters/${reporter}|outlets/${outlet})/contacts/reveal$`);
const searchPaths = new Set(['/reporters/search', '/outlets/search']);
const reporterSearchFields = new Set(['query', 'beats', 'region', 'country', 'state', 'limit', 'cursor']);
const outletSearchFields = new Set(['query', 'region', 'country', 'limit', 'cursor']);
const pageFields = new Set(['cursor']);

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function request(path, {
  method = 'GET', params = {}, body,
  key = process.env.REPORTERS_API_KEY,
  confirmContactReveal = false,
  idempotencyKey,
  fetchImpl = fetch,
} = {}) {
  const search = method === 'POST' && searchPaths.has(path);
  const reveal = method === 'POST' && revealPath.test(path);
  if (!(method === 'GET' && readPath.test(path)) && !search && !reveal) {
    throw new Error('Unsupported Reporters.io method or path');
  }
  if (!object(params) || Object.keys(params).some(name => !pageFields.has(name))) {
    throw new Error('Only cursor is accepted as a query parameter');
  }
  if (method === 'GET' && body !== undefined) throw new Error('GET requests cannot have a body');
  if (search && (!object(body) || Object.keys(body).some(name => !(path === '/reporters/search' ? reporterSearchFields : outletSearchFields).has(name)))) {
    throw new Error('Unsupported search body');
  }
  if (reveal && body === undefined) body = {};
  if (reveal && !confirmContactReveal) throw new Error('Contact reveal requires explicit confirmation');
  if (reveal && body !== undefined && (!object(body) || Object.keys(body).length)) {
    throw new Error('Contact reveal takes no request body');
  }
  const credential = key?.trim();
  if (!credential || /[\r\n]/.test(credential)) throw new Error('Set REPORTERS_API_KEY');
  if (idempotencyKey !== undefined && !/^[\x21-\x7e]{1,128}$/.test(idempotencyKey)) {
    throw new Error('Invalid idempotency key');
  }
  const url = new URL(basePath + path, origin);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(name, String(value));
  }
  const headers = { Authorization: `Bearer ${credential}`, Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (idempotencyKey !== undefined) headers['Idempotency-Key'] = idempotencyKey;
  let response;
  try {
    response = await fetchImpl(url, {
      method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: 'error', signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new Error('Could not reach Reporters.io; no automatic retry was made');
  }
  if (!response.ok) {
    const requestId = response.headers.get('x-request-id') || 'unavailable';
    throw new Error(`Reporters.io HTTP ${response.status}; request ID: ${requestId}`);
  }
  return response.json();
}
