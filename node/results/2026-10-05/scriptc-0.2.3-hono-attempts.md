# scriptc 0.2.3 and Hono

Every configuration we tried for building a Hono server with scriptc 0.2.3, on Node 24.21.0 with `hono` 4.12.34 and `@hono/node-server` 2.1.1. Our September post on scriptc 0.1.3 tried the app as written, `--dynamic`, a hand-written adapter and the whole app in the engine. `--npm-static` and `--provenance-sources` are new since then.

Only the last one serves requests, and it's the one the benchmark measures as `hono-scriptc`.

| configuration | flags | result |
| --- | --- | --- |
| [`server.ts`](../../apps/hono-hello/server.ts) as written | none | build fails: importing `hono` and `@hono/node-server` requires the embedded dynamic engine (SC2013) |
| `server.ts` | `--dynamic` | build fails: `@hono/node-server` imports `node:http2`, which the engine doesn't provide (SC2030); Hono's `Response & TypedResponse<…>` return type "resolves to no runtime shape" (SC2008) |
| `server.ts` | `--npm-static auto` | build fails: the `fetch` handler's `Promise<Response> \| Response` has no static representation (SC2011); `instanceof File` isn't supported (SC1090) |
| `server.ts` | `--npm-static auto --dynamic` | build fails with an internal error: `expected null \| object … at $.value, got undefined` (SC3004) |
| `server.ts` | `--provenance-sources`, with or without `--dynamic` | build fails: dozens of type errors in Hono's and the adapter's source (47 without `--dynamic`), such as `Cannot find name 'EventInit'` and `'BufferSource'` |
| the two GET routes only, with `@hono/node-server` | `--dynamic`, `--npm-static auto`, or both | the same errors, minus the ones from the POST routes |
| Hono behind a hand-written `createServer` adapter | `--npm-static auto` | builds once the content type is annotated as `string`; exits at startup: `element access on non-array values are not supported yet (instantiating 'mergePath' …)` in `hono/dist/utils/url.js` |
| the same adapter | `--npm-static auto --dynamic` | builds; exits at startup: `storing '(unknown, any) => …_Hono' values in a checked-dynamic object … is not supported yet` in `hono/dist/hono-base.js` |
| Hono and `@hono/node-server`, both in the engine | `--dynamic` | build fails: `node:http2` again (SC2030) |
| Hono and a `createServer` adapter, both in the engine | `--dynamic` | builds; exits at startup: `node:http 'createServer' is not supported in the scriptc island yet` |
| a native `createServer` calling Hono in the engine ([`scriptc/`](../../apps/hono-hello/scriptc/)) | `--dynamic` | **serves `/`, `/json` and a 404 correctly** |

In the working configuration, scriptc compiles the HTTP server to native code and the Hono app runs as JavaScript in scriptc's embedded QuickJS engine. Each request crosses from the native server into the engine and back. It's a different program from the one the GeaStack and Node rows run: it serves only the two GET routes, and it uses a small bridge instead of `@hono/node-server`.

Builds without a `tsconfig.json` also report `Cannot find name 'File'` and similar errors from Hono's type declarations. With a tsconfig that includes the `dom` library and Node's types, those go away and the errors above remain. The working build needs neither.
