import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from '../examples/node/reporters-client.mjs';
import { collectReporters } from '../examples/node/05-pagination.mjs';

test('POST search keeps credentials in a header and preserves JSON inputs', async () => {
  let sent;
  const body = { query: 'climate & technology', beats: ['technology'], limit: 10 };
  const result = await request('/reporters/search', { method: 'POST', body, key: 'fixture-key', fetchImpl: async (url, options) => { sent = { url, options }; return Response.json({ data: { items: [] }, request_id: 'test' }); } });
  assert.equal(sent.url.origin, 'https://reporters.io');
  assert.equal(sent.url.pathname, '/api/v1/reporters/search');
  assert.equal(sent.url.search, '');
  assert.equal(sent.options.headers.Authorization, 'Bearer fixture-key');
  assert.equal(sent.options.redirect, 'error');
  assert.deepEqual(JSON.parse(sent.options.body), body);
  assert.deepEqual(result.data.items, []);
});

test('rejects arbitrary URLs, unsupported endpoints and token query parameters before fetching', async () => {
  const fetchImpl = () => { throw new Error('must not fetch'); };
  for (const path of ['https://evil.example', '//evil.example', '/reporters/1/../account', '/api/admin', '/reporters/1?token=secret']) {
    await assert.rejects(request(path, { key: 'fixture-key', fetchImpl }), /Unsupported/);
  }
  await assert.rejects(request('/account', { key: 'fixture-key', params: { api_key: 'secret' }, fetchImpl }), /query parameter/);
});

test('contact reveal requires explicit confirmation and sends an empty JSON body plus the deliberate idempotency key', async () => {
  await assert.rejects(request('/reporters/123/contacts/reveal', { method: 'POST', key: 'fixture-key' }), /explicit confirmation/);
  let sent;
  await request('/reporters/123/contacts/reveal', { method: 'POST', key: 'fixture-key', confirmContactReveal: true, idempotencyKey: 'one-reveal', fetchImpl: async (_, options) => { sent = options; return Response.json({ data: {} }); } });
  assert.equal(sent.body, '{}');
  assert.equal(sent.headers['Idempotency-Key'], 'one-reveal');
});

test('an error is attempted once and does not print private response contents', async () => {
  let calls = 0;
  await assert.rejects(request('/account', { key: 'fixture-key', fetchImpl: async () => { calls += 1; return new Response('private contact body', { status: 403, headers: { 'x-request-id': 'request-123' } }); } }), /HTTP 403; request ID: request-123/);
  assert.equal(calls, 1);
});

test('pagination preserves filters and stops on repeated IDs', async () => {
  const calls = [];
  const items = await collectReporters('climate', { maxPages: 5, requestImpl: async (_, options) => { calls.push(options.body); return { data: { items: [{ id: '123' }], has_more: true, next_cursor: 'signed-cursor' } }; } });
  assert.equal(items.length, 1); assert.equal(calls.length, 2);
  assert.deepEqual(calls, [{ query: 'climate', limit: 10 }, { query: 'climate', limit: 10, cursor: 'signed-cursor' }]);
});

test('pagination obeys its request budget', async () => {
  let calls = 0;
  const items = await collectReporters('climate', { maxPages: 1, requestImpl: async () => { calls += 1; return { data: { items: [{ id: '123' }], has_more: true, next_cursor: 'cursor' } }; } });
  assert.equal(calls, 1); assert.equal(items.length, 1);
});


test('content lists have fixed page sizes and accept cursor only', async () => {
  await assert.rejects(request('/reporters/123/articles', { key: 'fixture-key', params: { limit: 10 } }), /query parameter/);
});
