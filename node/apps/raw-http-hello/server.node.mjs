import { createServer } from 'node:http';

const server = createServer((req, res) => {
  if (req.url === '/json') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end('{"hello":"world"}');

    return;
  }

  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Hello, World! ' + req.method + ' ' + req.url);
});

server.listen(3101, () => {
  console.log('node listening on http://127.0.0.1:3101');
});
