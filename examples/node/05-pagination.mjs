import { pathToFileURL } from 'node:url';
import { request } from './reporters-client.mjs';

export async function collectReporters(query, { maxPages = 2, requestImpl = request } = {}) {
  if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 10) throw new Error('maxPages must be 1–10');
  const filters = { query, limit: 10 };
  const output = [], ids = new Set(), cursors = new Set();
  let cursor;
  for (let page = 0; page < maxPages; page += 1) {
    const response = await requestImpl('/reporters/search', { method: 'POST', body: { ...filters, ...(cursor ? { cursor } : {}) } });
    const result = response.data;
    if (!Array.isArray(result?.items) || result.items.length === 0) break;
    let added = 0;
    for (const item of result.items) {
      const id = item.id;
      if (id == null || ids.has(String(id))) continue;
      ids.add(String(id)); output.push(item); added += 1;
    }
    if (!added || !result.has_more || !result.next_cursor || cursors.has(result.next_cursor)) break;
    cursor = result.next_cursor; cursors.add(cursor);
  }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await collectReporters(process.argv[2] || 'climate technology'), null, 2));
}
