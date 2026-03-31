import express, { type Request, type Response, type NextFunction } from 'express';
import { registerRoutes } from './routes';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialise routes once on cold start, reuse on warm invocations
let setupPromise: Promise<void> | null = null;

function ensureSetup(): Promise<void> {
  if (!setupPromise) {
    setupPromise = registerRoutes(app)
      .then(() => {
        // Error handler must be registered AFTER all routes
        app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
          const status = err.status || err.statusCode || 500;
          const message = err.message || 'Internal Server Error';
          console.error('[error]', message);
          res.status(status).json({ message });
        });
      })
      .catch((err) => {
        console.error('Fatal: failed to register routes:', err);
        setupPromise = null; // allow retry
        throw err;
      });
  }
  return setupPromise;
}

export default async function handler(req: Request, res: Response) {
  try {
    await ensureSetup();
    app(req, res);
  } catch (err: any) {
    console.error('Boot error:', err);
    res.status(500).json({ message: 'Server failed to start', detail: err?.message });
  }
}
