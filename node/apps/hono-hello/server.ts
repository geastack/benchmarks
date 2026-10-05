import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();
app.get('/', (c) => c.text('Hello Hono!'));
app.get('/json', (c) => c.json({ hello: 'world' }));
app.post('/body/json', async (c) => {
  const value = await c.req.json();
  if (typeof value !== 'object' || value === null) return c.text('invalid', 400);
  const body = value as Record<string, unknown>;

  return c.text(typeof body.name === 'string' ? body.name : 'invalid');
});
app.post('/body/form', async (c) => {
  const form = await c.req.formData();
  const field = form.get('field');
  const asset = form.get('asset');
  if (typeof field !== 'string' || !(asset instanceof File)) return c.text('invalid', 400);

  return c.text(field + ':' + asset.name + ':' + asset.type + ':' + String(asset.size));
});

serve({ fetch: (request) => app.fetch(request), port: 3900 }, () => {
  console.log('listening on http://127.0.0.1:3900');
});
