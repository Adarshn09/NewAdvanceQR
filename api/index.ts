import 'dotenv/config';
import express, { type Request, Response, NextFunction } from 'express';
import { registerRoutes } from '../server/routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
});

// We call registerRoutes once and cache the promise so it only runs on cold start
let setupPromise: Promise<any> | null = null;

function getApp() {
  if (!setupPromise) {
    setupPromise = registerRoutes(app).catch((err) => {
      console.error('Failed to register routes:', err);
      setupPromise = null; // allow retry on next request
      throw err;
    });
  }
  return setupPromise;
}

// Vercel serverless handler
export default async function handler(req: Request, res: Response) {
  await getApp();
  app(req, res);
}
