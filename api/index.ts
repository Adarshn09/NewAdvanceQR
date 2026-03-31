// This file is the Vercel serverless function entry point.
// The real logic lives in _server.ts, which is pre-bundled to _server.js
// by the vercel-build script (esbuild resolves @shared/* path aliases).

// @ts-ignore – _server.js is generated at build time by vercel-build
export { default } from './_server.js';
