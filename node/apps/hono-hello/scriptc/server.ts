// scriptc 0.2.3 builds this file to native code. It can't compile Hono itself (see
// ../../../README.md), so Hono runs in scriptc's embedded QuickJS engine through the
// local hono-island package, and this native node:http server calls into it.
import { createServer } from 'node:http';
import { handle } from 'hono-island';

const server = createServer(async (req, res) => {
  const result = await handle(req.method ?? 'GET', req.url ?? '/');
  const contentType: string = result.contentType;
  res.writeHead(result.status, { 'content-type': contentType });
  res.end(result.body);
});

server.listen({ port: 3900, reusePort: true }, () => {
  console.log('listening on http://127.0.0.1:3900');
});
