import { request } from './reporters-client.mjs';
console.log(JSON.stringify(await request('/outlets/search', { method: 'POST', body: { query: process.argv[2] || 'technology', limit: 10 } }), null, 2));
