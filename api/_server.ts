// api/_server.ts
// This file gets bundled by esbuild during vercel-build.
// esbuild resolves @shared/* aliases and produces a single api/_server.js
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from '../server/routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    console.log(`→ ${req.method} ${req.path}`);
  }
  next();
});

// Initialise once per cold start, reuse across warm invocations
let setupPromise: Promise<void> | null = null;

function ensureSetup(): Promise<void> {
  if (!setupPromise) {
    setupPromise = (async () => {
      await registerRoutes(app);

      // Error handler must be registered AFTER all routes
      app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        console.error('Unhandled error:', err);
        res.status(status).json({ message });
      });
    })().catch((err) => {
      console.error('Fatal: failed to initialise server:', err);
      setupPromise = null; // allow retry
      throw err;
    });
  }
  return setupPromise;
}

// Default export consumed by api/index.ts (Vercel serverless handler)
export default async function handler(req: Request, res: Response) {
  try {
    await ensureSetup();
    app(req, res);
  } catch (err: any) {
    console.error('Handler error:', err);
    res.status(500).json({ message: 'Server initialisation failed', error: err?.message });
  }
}
