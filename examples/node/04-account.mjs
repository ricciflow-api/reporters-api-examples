import { request } from './reporters-client.mjs';
console.log(JSON.stringify(await request('/account'), null, 2));
