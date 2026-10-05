// Node with NODE_WORKERS processes via node:cluster, each running server.ts unchanged
// (Node 24 strips the types). The primary hands accepted connections to the workers.
import cluster from 'node:cluster';
import os from 'node:os';

if (cluster.isPrimary) {
  const n = Number(process.env.NODE_WORKERS || os.availableParallelism());
  for (let i = 0; i < n; i++) cluster.fork();
} else {
  await import('./server.ts');
}
