// Multi-core node comparator: the SAME raw node:http server (server.node.mjs)
// forked across N workers via node:cluster. Mirrors the gea binary's
// GEA_WORKERS=N reuseport mode.
import cluster from 'node:cluster';
import os from 'node:os';

if (cluster.isPrimary) {
  const n = Number(process.env.NODE_WORKERS || os.availableParallelism());
  for (let i = 0; i < n; i++) cluster.fork();
  console.log(`raw-node cluster: ${n} workers on http://127.0.0.1:3000`);
} else {
  await import('./server.node.mjs');
}
