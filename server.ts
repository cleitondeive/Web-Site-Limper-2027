import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import {
  ALLOWED_COLLECTIONS,
  canAdminUserMutateCollection,
  createAdminSessionToken,
  extractBearerToken,
  hasEnvMasterPassword,
  isHashedPassword,
  normalizeUsername,
  sanitizeAdminUserForClient,
  verifyAdminSessionToken,
  verifyEnvMasterPassword,
  verifyPassword,
  type AdminCollectionName,
} from './server/auth.ts';
import { db, type StoredAdminUserRecord } from './server/db.ts';
import type { Order, SiteBackupPayload } from './src/types/commerce.ts';

interface AuthenticatedRequest extends Request {
  adminUser?: StoredAdminUserRecord;
}

const PORT = Number(process.env.PORT) || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function requireAdminAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req.headers.authorization);
  const claims = verifyAdminSessionToken(token);
  if (!claims) {
    res.status(401).json({ error: 'Sessão administrativa ausente ou expirada.' });
    return;
  }
  const user = await db.findAdminUserById(claims.sub);
  if (!user || !user.active) {
    res.status(403).json({ error: 'Conta administrativa suspensa ou inexistente.' });
    return;
  }
  req.adminUser = user;
  next();
}

function registerApiRoutes(app: express.Express): void {
  // 1. Health Check (used by Easypanel / Hostinger VPS rolling deploys)
  app.get('/api/health', async (_req: Request, res: Response) => {
    try {
      const status = await db.getDatabaseStatus();
      res.status(status.connected ? 200 : 503).json({
        ok: status.connected,
        service: 'limper-mt',
        environment: IS_PRODUCTION ? 'production' : 'development',
        database: {
          engine: status.engine,
          connected: status.connected,
          schemaVersion: status.schemaVersion,
          nonDestructiveMigrations: status.nonDestructiveMigrations,
          latencyMs: status.latencyMs,
        },
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({ ok: false, error: 'Database unavailable' });
    }
  });

  // 2. Public Storefront Bootstrap (only public catalog & store settings — zero PII or admin secrets)
  app.get('/api/storefront/bootstrap', async (_req: Request, res: Response) => {
    try {
      const storefront = await db.getPublicStorefront();
      res.json(storefront);
    } catch (err) {
      console.error('[API] GET /api/storefront/bootstrap failed:', err);
      res.status(500).json({ error: 'Não foi possível carregar o catálogo no momento.' });
    }
  });

  // 3. Public Order Placement (customers submitting checkout orders into PostgreSQL)
  app.post('/api/orders', async (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<Order> | null;
      if (
        !body ||
        typeof body !== 'object' ||
        typeof body.customerName !== 'string' ||
        body.customerName.trim().length < 2 ||
        typeof body.customerPhone !== 'string' ||
        body.customerPhone.replace(/\D/g, '').length < 10 ||
        !Array.isArray(body.items) ||
        body.items.length === 0
      ) {
        res.status(400).json({ error: 'Dados do pedido inválidos ou incompletos.' });
        return;
      }

      const saved = await db.createOrder(body as Order);
      res.status(201).json({ order: saved });
    } catch (err) {
      console.error('[API] POST /api/orders failed:', err);
      res.status(500).json({ error: 'Não foi possível registrar o pedido no banco de dados.' });
    }
  });

  // 4. Privacy-Isolated Customer Order Lookup (LGPD — returns ONLY orders matching exact phone)
  app.post('/api/orders/lookup', async (req: Request, res: Response) => {
    try {
      const phone = typeof req.body?.phone === 'string' ? req.body.phone : '';
      const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId : undefined;
      if (phone.replace(/\D/g, '').length < 10) {
        res.status(400).json({ error: 'Informe um WhatsApp válido com DDD.' });
        return;
      }
      const orders = await db.lookupOrdersByPhone(phone, orderId);
      res.json({ orders });
    } catch (err) {
      console.error('[API] POST /api/orders/lookup failed:', err);
      res.status(500).json({ error: 'Erro ao consultar pedidos.' });
    }
  });

  // 5. Admin Auth Status (tells Login UI whether first-run Master password setup is needed)
  app.get('/api/admin/auth/status', async (_req: Request, res: Response) => {
    try {
      const users = await db.getStoredAdminUsers();
      const master = users.find((u) => u.role === 'master' && u.active);
      const envPassConfigured = hasEnvMasterPassword();
      const masterHashExists = Boolean(master && isHashedPassword(master.passwordHash));
      const needsInitialSetup = !envPassConfigured && !masterHashExists;

      res.json({
        needsInitialSetup,
        hasEnvPasscode: envPassConfigured,
        databaseEngine: db.getMode(),
        defaultMasterUsername: master?.username || 'admin',
      });
    } catch (err) {
      console.error('[API] GET /api/admin/auth/status failed:', err);
      res.status(500).json({ error: 'Erro ao verificar estado de autenticação.' });
    }
  });

  // 6. One-Time First-Run Master Admin Setup (locks permanently once claimed or when env passcode is set)
  app.post('/api/admin/auth/setup', async (req: Request, res: Response) => {
    try {
      if (hasEnvMasterPassword()) {
        res.status(409).json({
          error: 'A senha Master já está configurada via variável de ambiente no servidor.',
        });
        return;
      }

      const username = normalizeUsername(req.body?.username || 'admin');
      const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

      if (username.length < 3 || !/^[a-z0-9._-]+$/.test(username)) {
        res.status(400).json({
          error: 'Informe um usuário válido (mínimo 3 caracteres, sem espaços).',
        });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({
          error: 'Defina uma senha forte com no mínimo 6 caracteres.',
        });
        return;
      }

      const master = await db.claimInitialMasterPassword(username, password);
      const token = createAdminSessionToken(master);
      res.status(201).json({
        token,
        user: sanitizeAdminUserForClient(master),
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'ALREADY_CLAIMED') {
        res.status(409).json({
          error: 'O acesso Master já foi configurado. Faça login normalmente.',
        });
        return;
      }
      console.error('[API] POST /api/admin/auth/setup failed:', err);
      res.status(500).json({ error: 'Erro ao configurar acesso Master.' });
    }
  });

  // 7. Server-Side Admin Login (verifies scrypt hashes + optional ADMIN_MASTER_PASSWORD env override)
  app.post('/api/admin/auth/login', async (req: Request, res: Response) => {
    try {
      const cleanUser = normalizeUsername(req.body?.username || '');
      const plainPassword = typeof req.body?.password === 'string' ? req.body.password : '';

      if (!cleanUser || !plainPassword) {
        res.status(400).json({ error: 'Informe usuário e senha de acesso.' });
        return;
      }

      const users = await db.getStoredAdminUsers();
      const matched = users.find((u) => {
        const uName = normalizeUsername(u.username);
        if (uName === cleanUser) return true;
        // Support legacy "limper" alias for the primary Master account
        if (u.role === 'master' && (cleanUser === 'limper' || cleanUser === 'admin')) {
          return uName === 'admin' || uName === 'limper';
        }
        return false;
      });

      if (!matched) {
        res.status(401).json({
          reason: 'invalid_credentials',
          error: 'Credenciais inválidas. Confira usuário e senha de acesso.',
        });
        return;
      }

      if (!matched.active) {
        res.status(403).json({
          reason: 'inactive_account',
          error: 'Esta conta administrativa está suspensa. Solicite reativação ao usuário Master.',
          matchedUser: sanitizeAdminUserForClient(matched),
        });
        return;
      }

      const envOverrideOk =
        matched.role === 'master' && verifyEnvMasterPassword(plainPassword);
      const hashOk = verifyPassword(plainPassword, matched.passwordHash);

      if (!envOverrideOk && !hashOk) {
        res.status(401).json({
          reason: 'invalid_credentials',
          error: 'Credenciais inválidas. Confira usuário e senha de acesso.',
        });
        return;
      }

      await db.recordAdminLastLogin(matched.id);
      const token = createAdminSessionToken(matched);
      res.json({
        token,
        user: sanitizeAdminUserForClient({
          ...matched,
          lastLoginAt: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('[API] POST /api/admin/auth/login failed:', err);
      res.status(500).json({ error: 'Erro interno ao autenticar.' });
    }
  });

  // 8. Authenticated Admin Full Bootstrap
  app.get('/api/admin/bootstrap', requireAdminAuth, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const [dataset, dbStatus] = await Promise.all([
        db.getFullAdminDataset(),
        db.getDatabaseStatus(),
      ]);
      res.json({ ...dataset, dbStatus });
    } catch (err) {
      console.error('[API] GET /api/admin/bootstrap failed:', err);
      res.status(500).json({ error: 'Erro ao carregar dados administrativos.' });
    }
  });

  // 9. Authenticated Admin Database Status
  app.get('/api/admin/db-status', requireAdminAuth, async (_req: AuthenticatedRequest, res: Response) => {
    try {
      const status = await db.getDatabaseStatus();
      res.json(status);
    } catch {
      res.status(500).json({ error: 'Erro ao consultar status do banco de dados.' });
    }
  });

  // 10. Authenticated Admin Collection Save (strict allowlist + RBAC enforcement)
  app.put(
    '/api/admin/collections/:collection',
    requireAdminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const collection = req.params.collection as AdminCollectionName;
        if (!ALLOWED_COLLECTIONS.has(collection)) {
          res.status(400).json({ error: 'Coleção de dados inválida.' });
          return;
        }

        const actor = req.adminUser!;
        if (!canAdminUserMutateCollection(actor, collection)) {
          res.status(403).json({
            error: 'Seu perfil não possui permissão para alterar este módulo.',
          });
          return;
        }

        const payload = req.body?.data;
        if (payload === undefined) {
          res.status(400).json({ error: 'Corpo de dados ausente.' });
          return;
        }

        await db.saveCollection(collection, payload);
        res.json({ ok: true, collection, savedAt: new Date().toISOString() });
      } catch (err) {
        console.error(`[API] PUT /api/admin/collections/${req.params.collection} failed:`, err);
        res.status(500).json({ error: 'Erro ao salvar alterações no banco de dados.' });
      }
    }
  );

  // 11. Authenticated Master Atomic Backup Restore
  app.post(
    '/api/admin/restore',
    requireAdminAuth,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        if (req.adminUser?.role !== 'master') {
          res.status(403).json({
            error: 'Somente o Administrador Master pode restaurar um backup completo.',
          });
          return;
        }
        const payload = req.body?.payload as SiteBackupPayload | undefined;
        if (!payload || typeof payload !== 'object') {
          res.status(400).json({ error: 'Payload de backup inválido.' });
          return;
        }
        await db.restoreFullBackup(payload);
        res.json({ ok: true, restoredAt: new Date().toISOString() });
      } catch (err) {
        console.error('[API] POST /api/admin/restore failed:', err);
        res.status(500).json({ error: 'Erro ao restaurar backup no banco de dados.' });
      }
    }
  );
}

async function startServer(): Promise<void> {
  await db.init();

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '25mb' }));

  registerApiRoutes(app);

  // Return JSON 404 for unknown API routes instead of SPA HTML
  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'Endpoint não encontrado.' });
  });

  if (IS_PRODUCTION) {
    const distDir = path.resolve(process.cwd(), 'dist');
    const indexHtmlPath = path.join(distDir, 'index.html');

    app.use(
      '/assets',
      express.static(path.join(distDir, 'assets'), {
        maxAge: '1y',
        immutable: true,
      })
    );
    app.use(express.static(distDir, { index: false }));

    app.get('*', (_req: Request, res: Response) => {
      if (fs.existsSync(indexHtmlPath)) {
        res.sendFile(indexHtmlPath);
      } else {
        res.status(500).send('Build de produção (dist/index.html) não encontrado.');
      }
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Limper MT] Server running on http://0.0.0.0:${PORT} (${IS_PRODUCTION ? 'production' : 'development'} · DB: ${db.getMode()})`
    );
  });

  const shutdown = async () => {
    console.log('[Limper MT] Graceful shutdown initiated...');
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('[Limper MT] Fatal server startup error:', err);
  process.exit(1);
});
