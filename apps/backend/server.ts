import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  backendEnv,
  getConfiguredCorsOrigins,
  isCourierWebhookConfigured,
  isLiveDatabaseConfigured,
  isPersistentFinanceEnabled
} from './config/env.js';
import { aiRouter } from './modules/ai/aiRoutes.js';
import { messagingRouter } from './modules/messaging/messagingRoutes.js';
import { wholesaleRouter } from './modules/wholesale/wholesaleRoutes.js';
import { walletRouter } from './modules/wallet/walletRoutes.js';
import { escrowRouter } from './modules/escrow/escrowRoutes.js';
import { orderRouter } from './modules/orders/orderRoutes.js';
import { logisticsRouter } from './modules/logistics/logisticsRoutes.js';
import { vendorRouter } from './modules/vendors/vendorRoutes.js';
import { retailRouter } from './modules/retail/retailRoutes.js';
import { authRouter } from './modules/auth/authRoutes.js';
import { catalogRouter } from './modules/catalog/catalogRoutes.js';
import { analyticsRouter } from './modules/analytics/analyticsRoutes.js';
import { notificationRouter } from './modules/notifications/notificationRoutes.js';
import { paymentRouter } from './modules/payment/paymentRoutes.js';
import rfqRouter from './modules/rfq/rfqRoutes.js';
import identityRouter from './modules/identity/identityRoutes.js';
import storageRouter from './modules/storage/storageRoutes.js';
import { socialRouter } from './modules/social/socialRoutes.js';
import { resolveFirebaseProjectId } from './middleware/requireFirebaseAuth.js';
import { aiRateLimiter, authRateLimiter, generalRateLimiter } from './middleware/rateLimit.js';
import { sanitizeApiInputs } from './middleware/sanitize.js';
import { securityHeadersMiddleware } from './middleware/securityHeaders.js';
import { auditMiddleware } from './middleware/audit.js';
import { checkDatabaseConnection, supabaseAdmin } from './services/dbService.js';
import { logger } from './services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = backendEnv.port;

// Trust first proxy hop (Render / Cloud Run / AI Studio reverse proxy) for accurate rate-limiting IP resolution
app.set('trust proxy', 1);

// Iframe-safe hardened security headers (intentionally omits X-Frame-Options to preserve AI Studio preview iframe)
app.use(securityHeadersMiddleware);

// Restrict browser API access to configured app origins, same-host requests, and local development.
const configuredOrigins = getConfiguredCorsOrigins();

app.use((req, res, next) => {
  const reqHost = req.get('host');
  const corsMiddleware = cors({
    origin: (origin, callback) => {
      const isLocalDevelopment = Boolean(origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
      const isSameHost = Boolean(
        origin &&
        reqHost &&
        (origin === `https://${reqHost}` || origin === `http://${reqHost}`)
      );
      if (!origin || isLocalDevelopment || isSameHost || configuredOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS.'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Idempotency-Key',
      'X-Courier-Signature',
      'X-Payment-Signature',
      'X-Webhook-Signature',
      'X-Courier-Secret',
      'X-Payment-Secret'
    ]
  });
  corsMiddleware(req, res, next);
});

app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      (req as Request & { rawBody?: Buffer }).rawBody = buf;
    }
  })
);

// Static serving for frontend assets referenced via /src/assets/
const assetCandidates = [
  path.resolve(__dirname, 'apps/frontend/src/assets'),
  path.resolve(__dirname, '../frontend/src/assets'),
  path.resolve(process.cwd(), 'apps/frontend/src/assets'),
  path.resolve(process.cwd(), 'src/assets')
];
const assetPath = assetCandidates.find((c) => fs.existsSync(c));
if (assetPath) {
  app.use('/src/assets', express.static(assetPath));
}

// Sanitize JSON/query inputs, audit security/mutation routes, and apply tiered rate limits across API routes
app.use('/api', sanitizeApiInputs);
app.use('/api', auditMiddleware);
app.use('/api', generalRateLimiter);

app.use('/api/ai', aiRateLimiter, aiRouter);
app.use('/api/messages', messagingRouter);
app.use('/api/wholesale', wholesaleRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/escrow', escrowRouter);
app.use('/api/orders', orderRouter);
app.use('/api/logistics', logisticsRouter);
app.use('/api/vendors', vendorRouter);
app.use('/api/retail', retailRouter);
app.use('/api/auth', authRateLimiter, authRouter);
app.use('/api/catalog', catalogRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/rfq', rfqRouter);
app.use('/api/forecasting', rfqRouter);
app.use('/api/identity', identityRouter);
app.use('/api/storage', storageRouter);

// Versioned /api/v1/* aliases for seamless compatibility with PaikarMart-web production clients
app.use('/api/v1/ai', aiRateLimiter, aiRouter);
app.use('/api/v1/messages', messagingRouter);
app.use('/api/v1/wholesale', wholesaleRouter);
app.use('/api/v1/wallet', walletRouter);
app.use('/api/v1/escrow', escrowRouter);
app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/logistics', logisticsRouter);
app.use('/api/v1/vendors', vendorRouter);
app.use('/api/v1/retail', retailRouter);
app.use('/api/v1/auth', authRateLimiter, authRouter);
app.use('/api/v1/catalog', catalogRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/notifications', notificationRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/rfq', rfqRouter);
app.use('/api/v1/forecasting', rfqRouter);
app.use('/api/v1/identity', identityRouter);
app.use('/api/v1/verifications', identityRouter);
app.use('/api/v1/storage', storageRouter);
app.use('/api/feed', socialRouter);
app.use('/api/v1/feed', socialRouter);

// REST API Endpoints
const handleHealthCheck = async (_req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();

  res.json({
    status: 'ok',
    version: '1.7.0',
    environment: process.env.NODE_ENV || 'development',
    architecture: {
      backend: 'Render / Cloud Run Web Service (Node.js/Express)',
      database: dbStatus,
      prismaConfigured: Boolean(process.env.DATABASE_URL),
      supabaseAdminConfigured: Boolean(supabaseAdmin) && isLiveDatabaseConfigured(),
      persistentFinanceReady: isPersistentFinanceEnabled(),
      courierWebhooksReady: isCourierWebhookConfigured(),
      firebaseProject: resolveFirebaseProjectId() || backendEnv.firebaseProjectId,
      storageBackend: supabaseAdmin ? 'Supabase Storage (Signed Assets)' : 'Filename Fallback (No Cloud Bucket)',
      auth: 'Firebase Authentication (Spark Free Tier)',
      frontend: 'Vercel (Vite React SPA)'
    }
  });
};

app.get(['/api/health', '/api/v1/health'], handleHealthCheck);

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Resolve frontend dist whether executed from root bundled `server.js` or `apps/backend/server.ts`
    const distCandidates = [
      path.resolve(__dirname, 'apps/frontend/dist'),
      path.resolve(__dirname, '../frontend/dist'),
      path.resolve(process.cwd(), 'apps/frontend/dist')
    ];
    const distPath = distCandidates.find((candidate) => fs.existsSync(candidate)) || distCandidates[0];
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API route not found.' });
        return;
      }
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Vite Dev Server middleware for local preview
    const frontendCandidates = [
      path.resolve(__dirname, '../frontend'),
      path.resolve(__dirname, 'apps/frontend'),
      path.resolve(process.cwd(), 'apps/frontend')
    ];
    const frontendRoot = frontendCandidates.find((c) => fs.existsSync(c)) || frontendCandidates[0];
    const configFile = path.resolve(frontendRoot, 'vite.config.ts');
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: frontendRoot,
      configFile: configFile,
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000,
        hmr: false,
        ws: false,
        watch: null,
      },
      appType: 'spa',
    });

    // Prevent Vite 8 @vite/client from opening a WebSocket (e.g. port 24678) when HMR/WS is disabled
    app.use(async (req: Request, res: Response, next) => {
      if (req.method === 'GET' && req.path === '/@vite/client') {
        try {
          const transformed = await vite.transformRequest('/@vite/client');
          if (transformed?.code) {
            const safeClientCode = transformed.code.replace(
              /transport\.connect\([^;]*\);/,
              '/* HMR WebSocket connection disabled */'
            );
            res
              .status(200)
              .set({
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-cache',
              })
              .send(safeClientCode);
            return;
          }
        } catch {
          // Fall through to Vite middleware if transformRequest fails
        }
      }
      next();
    });

    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    logger.info('PaikarMart Super App Server started', { module: 'server', port: PORT });
  });
}

startServer();
