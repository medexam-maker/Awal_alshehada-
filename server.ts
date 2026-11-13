import dotenv from 'dotenv';
// Do not override system/Netlify environment variables
dotenv.config();
import express from 'express';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import examRoutes from './src/server/routes/examRoutes';
import authRoutes from './src/server/routes/authRoutes';
import subjectRoutes from './src/server/routes/subjectRoutes';
import adminRoutes from './src/server/routes/adminRoutes';
import { requireAuth, AuthenticatedRequest } from './src/server/middleware/auth';
import { mediaStorage } from './src/server/lib/mediaStorage';

const app = express();

app.use(express.json({ limit: '10mb' }));

// Serve public directory assets (PWA manifest, icons, sitemap, robots)
app.use(express.static(path.resolve(process.cwd(), 'public')));

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  res.sendFile(path.resolve(process.cwd(), 'public/robots.txt'));
});

app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml');
  res.sendFile(path.resolve(process.cwd(), 'public/sitemap.xml'));
});

// GET /api/media/:id (any authenticated user)
app.get('/api/media/:id', requireAuth, async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const asset = await mediaStorage.getAssetBytes(id);
    if (!asset) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Media asset not found', details: {} },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const quotedEtag = `"${asset.sha256}"`;
    const clientEtag = req.headers['if-none-match'];

    res.set({
      'Content-Type': asset.mimeType,
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'ETag': quotedEtag,
      'Cache-Control': 'private, max-age=31536000, immutable',
    });

    if (clientEtag === quotedEtag || clientEtag === asset.sha256) {
      res.status(304).end();
      return;
    }

    res.send(asset.data);
  } catch (err) {
    console.error('[media/:id:GET] Error serving media asset:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to retrieve media asset', details: {} },
      timestamp: new Date().toISOString(),
    });
  }
});

// Mount the API routes
app.use('/api/auth', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/admin', adminRoutes);

export { app };

// Guard app.listen() so it only runs when server.ts is executed directly, never when imported as a module by serverless functions
const isServerless = Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME);

async function startServer() {
  const isMain = process.argv[1] && (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));
  if (!isMain || isServerless || process.env.NODE_ENV === 'test') {
    return;
  }

  // Parse port from CLI flags --port 3000 or -p 3000 if process.env.PORT is not set
  let cliPort: number | undefined;
  const portFlagIdx = process.argv.findIndex((arg) => arg === '--port' || arg === '-p');
  if (portFlagIdx !== -1 && process.argv[portFlagIdx + 1]) {
    const parsed = Number(process.argv[portFlagIdx + 1]);
    if (!isNaN(parsed) && parsed > 0) cliPort = parsed;
  }

  const PORT = Number(process.env.PORT) || cliPort || 3000;

  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite middleware in development as required by the framework constitution
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[server] Startup error:', err);
});

