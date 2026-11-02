import { request } from './reporters-client.mjs';
console.log(JSON.stringify(await request('/reporters/search', { method: 'POST', body: { query: process.argv[2] || 'climate technology', limit: 10 } }), null, 2));
