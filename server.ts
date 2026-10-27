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

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

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

// Mount the API routes
app.use('/api/auth', authRoutes);
app.use('/api/exam', examRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/admin', adminRoutes);

export { app };

// Guard app.listen() so it only runs when server.ts is executed directly, never when imported as a module by serverless functions
const isDirectExecution = (() => {
  if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  if (!process.argv[1]) {
    return false;
  }
  try {
    const currentFilePath = fileURLToPath(import.meta.url);
    const executedFilePath = path.resolve(process.argv[1]);
    return currentFilePath === executedFilePath;
  } catch {
    return false;
  }
})();

async function startServer() {
  if (!isDirectExecution || process.env.NODE_ENV === 'test') {
    return;
  }

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

