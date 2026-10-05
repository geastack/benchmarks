// The same two GET routes as ../../server.ts. scriptc embeds this package's JavaScript
// and runs it in QuickJS when the program is built with --dynamic.
import { Hono } from 'hono';

const app = new Hono();
app.get('/', (c) => c.text('Hello Hono!'));
app.get('/json', (c) => c.json({ hello: 'world' }));

export async function handle(method, url) {
  const response = await app.fetch(new Request('http://localhost' + url, { method }));

  return {
    status: response.status,
    contentType: response.headers.get('content-type') || 'text/plain; charset=utf-8',
    body: await response.text(),
  };
}
