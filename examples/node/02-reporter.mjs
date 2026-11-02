import { request } from './reporters-client.mjs';
const id = process.argv[2];
if (!id) throw new Error('Pass a reporter ID from search results');
console.log(JSON.stringify(await request(`/reporters/${id}`), null, 2));
