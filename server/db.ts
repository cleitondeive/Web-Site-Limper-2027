import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import type {
  AdminUser,
  BackupScheduleConfig,
  Category,
  DeletedProductEntry,
  MonthlySalesGoal,
  Order,
  Product,
  PromoBanner,
  PromoCoupon,
  PromoKit,
  SecurityAuditEvent,
  SellerCustomProduct,
  SellerQuote,
  SiteBackupPayload,
  SiteBackupSnapshot,
  StoreSettings,
} from '../src/types/commerce.ts';
import {
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_KITS,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_STORE_SETTINGS,
} from '../src/data/initialCatalog.ts';
import {
  ALL_ADMIN_TABS,
  hashPassword,
  isHashedPassword,
  normalizeUsername,
  sanitizeAdminUserForClient,
  type AdminCollectionName,
} from './auth.ts';

const { Pool } = pg;

export const DB_SCHEMA_VERSION = 1;

export interface StoredAdminUserRecord extends AdminUser {
  passwordHash: string;
}

export interface FullStoreDataset {
  categories: Category[];
  products: Product[];
  deletedProducts: DeletedProductEntry[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
  orders: Order[];
  settings: StoreSettings;
  adminUsers: AdminUser[];
  securityLogs: SecurityAuditEvent[];
  siteBackups: SiteBackupSnapshot[];
  backupSchedule: BackupScheduleConfig;
  sellerQuotes: SellerQuote[];
  sellerCustomProducts: SellerCustomProduct[];
  monthlySalesGoals: MonthlySalesGoal[];
}

export interface PublicStorefrontDataset {
  categories: Category[];
  products: Product[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
  settings: StoreSettings;
}

export interface DatabaseStatusInfo {
  engine: 'postgresql' | 'local_file';
  connected: boolean;
  schemaVersion: number;
  seedCompletedAt: string | null;
  nonDestructiveMigrations: boolean;
  latencyMs: number | null;
  counts: {
    categories: number;
    products: number;
    orders: number;
    kits: number;
    coupons: number;
    banners: number;
    adminUsers: number;
    sellerQuotes: number;
    siteBackups: number;
  };
}

interface LocalDbFileShape {
  schemaVersion: number;
  initialSeedCompleted: boolean;
  seedCompletedAt: string;
  categories: Category[];
  products: Product[];
  deletedProducts: DeletedProductEntry[];
  kits: PromoKit[];
  coupons: PromoCoupon[];
  banners: PromoBanner[];
  orders: Order[];
  settings: StoreSettings;
  adminUsers: StoredAdminUserRecord[];
  securityLogs: SecurityAuditEvent[];
  siteBackups: SiteBackupSnapshot[];
  backupSchedule: BackupScheduleConfig;
  sellerQuotes: SellerQuote[];
  sellerCustomProducts: SellerCustomProduct[];
  monthlySalesGoals: MonthlySalesGoal[];
}

const DEFAULT_BACKUP_SCHEDULE: BackupScheduleConfig = {
  enabled: true,
  times: ['12:00', '18:00'],
  daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
  autoBackupOnExit: true,
  runMissedOnReopen: true,
  maxRetention: 15,
  reminder: {
    enabled: true,
    thresholdHours: 24,
    style: 'toast',
  },
};

function createInitialMasterUserRecord(): StoredAdminUserRecord {
  return {
    id: 'admin-master-1',
    name: 'Administrador Master',
    username: 'admin',
    password: '',
    passwordHash: '',
    role: 'master',
    jobTitle: 'Diretoria · Limper MT',
    email: 'admin@limpermt.com.br',
    allowedTabs: [...ALL_ADMIN_TABS],
    active: true,
    createdAt: new Date().toISOString(),
    createdBy: 'Sistema',
  };
}

function normalizePhoneDigits(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) {
    return digits.slice(2);
  }
  return digits;
}

function safeTimestamp(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function stripPasswordFromAdminRecord(user: AdminUser): AdminUser {
  return {
    ...user,
    username: normalizeUsername(user.username),
    password: '',
  };
}

class LimperDatabase {
  private pool: pg.Pool | null = null;
  private mode: 'postgresql' | 'local_file' = 'local_file';
  private localFilePath: string;
  private localData: LocalDbFileShape | null = null;
  private initialized = false;
  private seedCompletedAt: string | null = null;

  constructor() {
    this.localFilePath = path.resolve(process.cwd(), 'data', 'limper-local-db.json');
  }

  public getMode(): 'postgresql' | 'local_file' {
    return this.mode;
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    const databaseUrl = process.env.DATABASE_URL?.trim();
    if (databaseUrl) {
      this.mode = 'postgresql';
      const useSsl =
        process.env.DATABASE_SSL === 'true' ||
        databaseUrl.includes('sslmode=require') ||
        databaseUrl.includes('sslmode=verify-full');

      this.pool = new Pool({
        connectionString: databaseUrl,
        ssl: useSsl ? { rejectUnauthorized: false } : undefined,
        max: 15,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
      });

      this.pool.on('error', (err) => {
        console.error('[Limper DB] PostgreSQL pool idle client error:', err.message);
      });

      await this.connectWithRetry();
      await this.runPostgresMigrationsAndSeedOnce();
      this.initialized = true;
      console.log('[Limper DB] PostgreSQL connected and verified (zero-data-loss mode).');
      return;
    }

    this.mode = 'local_file';
    this.initLocalFallbackStore();
    this.initialized = true;
    console.log(
      '[Limper DB] DATABASE_URL not configured — running in persistent local fallback mode (data/limper-local-db.json).'
    );
  }

  private async connectWithRetry(): Promise<void> {
    if (!this.pool) return;
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const client = await this.pool.connect();
        try {
          await client.query('SELECT 1');
        } finally {
          client.release();
        }
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt === maxAttempts) {
          throw new Error(`Failed to connect to PostgreSQL after ${maxAttempts} attempts: ${msg}`);
        }
        const delayMs = Math.min(500 * attempt, 3000);
        console.warn(
          `[Limper DB] Waiting for PostgreSQL (${attempt}/${maxAttempts}) — retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  private async runPostgresMigrationsAndSeedOnce(): Promise<void> {
    if (!this.pool) throw new Error('PostgreSQL pool not initialized');

    const schemaPath = path.resolve(process.cwd(), 'server', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(schemaSql);

      const metaRes = await client.query<{ value: { seededAt?: string } }>(
        'SELECT value FROM app_meta WHERE key = $1',
        ['initial_seed_completed']
      );

      if (metaRes.rows.length === 0) {
        const nowIso = new Date().toISOString();

        for (let i = 0; i < INITIAL_CATEGORIES.length; i++) {
          const c = INITIAL_CATEGORIES[i];
          await client.query(
            `INSERT INTO categories (id, name, short_name, sort_order, data, updated_at)
             VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [c.id, c.name, c.shortName, c.order ?? i + 1, JSON.stringify(c)]
          );
        }

        for (let i = 0; i < INITIAL_PRODUCTS.length; i++) {
          const p = INITIAL_PRODUCTS[i];
          await client.query(
            `INSERT INTO products (id, sku, category_id, title, status, price, promo_price, show_price, featured, sort_order, data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [
              p.id,
              p.sku || '',
              p.categoryId || '',
              p.title,
              p.status || 'active',
              Number(p.price) || 0,
              p.promoPrice != null ? Number(p.promoPrice) : null,
              Boolean(p.showPrice),
              Boolean(p.featured),
              i,
              JSON.stringify(p),
            ]
          );
        }

        for (let i = 0; i < INITIAL_KITS.length; i++) {
          const k = INITIAL_KITS[i];
          await client.query(
            `INSERT INTO promo_kits (id, sku, title, active, sort_order, data, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [k.id, k.sku || '', k.title, Boolean(k.active), i, JSON.stringify(k)]
          );
        }

        for (let i = 0; i < INITIAL_COUPONS.length; i++) {
          const c = INITIAL_COUPONS[i];
          await client.query(
            `INSERT INTO promo_coupons (id, code, active, sort_order, data, updated_at)
             VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [c.id, c.code, Boolean(c.active), i, JSON.stringify(c)]
          );
        }

        for (let i = 0; i < INITIAL_BANNERS.length; i++) {
          const b = INITIAL_BANNERS[i];
          await client.query(
            `INSERT INTO promo_banners (id, title, active, sort_order, data, updated_at)
             VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [b.id, b.title, Boolean(b.active), b.order ?? i + 1, JSON.stringify(b)]
          );
        }

        if (process.env.SEED_SAMPLE_ORDERS !== 'false') {
          for (const o of INITIAL_ORDERS) {
            await client.query(
              `INSERT INTO orders (id, customer_name, customer_phone, customer_phone_digits, status, delivery_type, total, created_at, data, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::jsonb, NOW())
               ON CONFLICT (id) DO NOTHING`,
              [
                o.id,
                o.customerName || '',
                o.customerPhone || '',
                normalizePhoneDigits(o.customerPhone || ''),
                o.status || 'received',
                o.deliveryType || 'pickup',
                Number(o.total) || 0,
                safeTimestamp(o.createdAt),
                JSON.stringify(o),
              ]
            );
          }
        }

        await client.query(
          `INSERT INTO store_settings (id, data, updated_at)
           VALUES ('default', $1::jsonb, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [JSON.stringify(INITIAL_STORE_SETTINGS)]
        );

        await client.query(
          `INSERT INTO backup_schedule (id, data, updated_at)
           VALUES ('default', $1::jsonb, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [JSON.stringify(DEFAULT_BACKUP_SCHEDULE)]
        );

        const initialMaster = createInitialMasterUserRecord();
        await client.query(
          `INSERT INTO admin_users (id, username, role, active, password_hash, sort_order, data, updated_at)
           VALUES ($1, $2, $3, $4, $5, 0, $6::jsonb, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [
            initialMaster.id,
            initialMaster.username,
            initialMaster.role,
            initialMaster.active,
            initialMaster.passwordHash,
            JSON.stringify(stripPasswordFromAdminRecord(initialMaster)),
          ]
        );

        await client.query(
          `INSERT INTO app_meta (key, value, updated_at)
           VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (key) DO NOTHING`,
          [
            'initial_seed_completed',
            JSON.stringify({ schemaVersion: DB_SCHEMA_VERSION, seededAt: nowIso }),
          ]
        );
        this.seedCompletedAt = nowIso;
      } else {
        this.seedCompletedAt = metaRes.rows[0].value?.seededAt || null;
      }

      await client.query(
        `INSERT INTO app_meta (key, value, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [
          'schema_version',
          JSON.stringify({ version: DB_SCHEMA_VERSION, verifiedAt: new Date().toISOString() }),
        ]
      );

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private initLocalFallbackStore(): void {
    const dir = path.dirname(this.localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.localFilePath)) {
      try {
        const raw = fs.readFileSync(this.localFilePath, 'utf8');
        const parsed = JSON.parse(raw) as Partial<LocalDbFileShape>;
        if (parsed && parsed.initialSeedCompleted) {
          this.localData = {
            schemaVersion: DB_SCHEMA_VERSION,
            initialSeedCompleted: true,
            seedCompletedAt: parsed.seedCompletedAt || new Date().toISOString(),
            categories: Array.isArray(parsed.categories) ? parsed.categories : INITIAL_CATEGORIES,
            products: Array.isArray(parsed.products) ? parsed.products : INITIAL_PRODUCTS,
            deletedProducts: Array.isArray(parsed.deletedProducts) ? parsed.deletedProducts : [],
            kits: Array.isArray(parsed.kits) ? parsed.kits : INITIAL_KITS,
            coupons: Array.isArray(parsed.coupons) ? parsed.coupons : INITIAL_COUPONS,
            banners: Array.isArray(parsed.banners) ? parsed.banners : INITIAL_BANNERS,
            orders: Array.isArray(parsed.orders) ? parsed.orders : INITIAL_ORDERS,
            settings: parsed.settings ? { ...INITIAL_STORE_SETTINGS, ...parsed.settings } : INITIAL_STORE_SETTINGS,
            adminUsers:
              Array.isArray(parsed.adminUsers) && parsed.adminUsers.length > 0
                ? parsed.adminUsers
                : [createInitialMasterUserRecord()],
            securityLogs: Array.isArray(parsed.securityLogs) ? parsed.securityLogs : [],
            siteBackups: Array.isArray(parsed.siteBackups) ? parsed.siteBackups : [],
            backupSchedule: parsed.backupSchedule || DEFAULT_BACKUP_SCHEDULE,
            sellerQuotes: Array.isArray(parsed.sellerQuotes) ? parsed.sellerQuotes : [],
            sellerCustomProducts: Array.isArray(parsed.sellerCustomProducts)
              ? parsed.sellerCustomProducts
              : [],
            monthlySalesGoals: Array.isArray(parsed.monthlySalesGoals)
              ? parsed.monthlySalesGoals
              : [],
          };
          this.seedCompletedAt = this.localData.seedCompletedAt;
          return;
        }
      } catch {
        // Fall through to seed fresh local fallback file
      }
    }

    const nowIso = new Date().toISOString();
    this.localData = {
      schemaVersion: DB_SCHEMA_VERSION,
      initialSeedCompleted: true,
      seedCompletedAt: nowIso,
      categories: INITIAL_CATEGORIES,
      products: INITIAL_PRODUCTS,
      deletedProducts: [],
      kits: INITIAL_KITS,
      coupons: INITIAL_COUPONS,
      banners: INITIAL_BANNERS,
      orders: INITIAL_ORDERS,
      settings: INITIAL_STORE_SETTINGS,
      adminUsers: [createInitialMasterUserRecord()],
      securityLogs: [],
      siteBackups: [],
      backupSchedule: DEFAULT_BACKUP_SCHEDULE,
      sellerQuotes: [],
      sellerCustomProducts: [],
      monthlySalesGoals: [],
    };
    this.seedCompletedAt = nowIso;
    this.flushLocalStore();
  }

  private flushLocalStore(): void {
    if (!this.localData) return;
    const dir = path.dirname(this.localFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${this.localFilePath}.tmp.${process.pid}`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.localData, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.localFilePath);
  }

  public async getPublicStorefront(): Promise<PublicStorefrontDataset> {
    if (this.mode === 'local_file') {
      const d = this.localData!;
      return {
        categories: d.categories,
        products: d.products,
        kits: d.kits,
        coupons: d.coupons,
        banners: d.banners,
        settings: d.settings,
      };
    }

    const pool = this.pool!;
    const [cats, prods, kits, coupons, banners, settings] = await Promise.all([
      pool.query<{ data: Category }>('SELECT data FROM categories ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: Product }>('SELECT data FROM products ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: PromoKit }>('SELECT data FROM promo_kits ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: PromoCoupon }>('SELECT data FROM promo_coupons ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: PromoBanner }>('SELECT data FROM promo_banners ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: StoreSettings }>("SELECT data FROM store_settings WHERE id = 'default'"),
    ]);

    return {
      categories: cats.rows.map((r) => r.data),
      products: prods.rows.map((r) => r.data),
      kits: kits.rows.map((r) => r.data),
      coupons: coupons.rows.map((r) => r.data),
      banners: banners.rows.map((r) => r.data),
      settings: settings.rows[0]?.data || INITIAL_STORE_SETTINGS,
    };
  }

  public async getFullAdminDataset(): Promise<FullStoreDataset> {
    if (this.mode === 'local_file') {
      const d = this.localData!;
      return {
        categories: d.categories,
        products: d.products,
        deletedProducts: d.deletedProducts,
        kits: d.kits,
        coupons: d.coupons,
        banners: d.banners,
        orders: d.orders,
        settings: d.settings,
        adminUsers: d.adminUsers.map(sanitizeAdminUserForClient),
        securityLogs: d.securityLogs,
        siteBackups: d.siteBackups,
        backupSchedule: d.backupSchedule,
        sellerQuotes: d.sellerQuotes,
        sellerCustomProducts: d.sellerCustomProducts,
        monthlySalesGoals: d.monthlySalesGoals,
      };
    }

    const pool = this.pool!;
    const [
      cats,
      prods,
      deletedProds,
      kits,
      coupons,
      banners,
      orders,
      settings,
      adminUsers,
      securityLogs,
      siteBackups,
      backupSchedule,
      sellerQuotes,
      sellerCustomProducts,
      monthlySalesGoals,
    ] = await Promise.all([
      pool.query<{ data: Category }>('SELECT data FROM categories ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: Product }>('SELECT data FROM products ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: DeletedProductEntry }>('SELECT data FROM deleted_products ORDER BY deleted_at DESC'),
      pool.query<{ data: PromoKit }>('SELECT data FROM promo_kits ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: PromoCoupon }>('SELECT data FROM promo_coupons ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: PromoBanner }>('SELECT data FROM promo_banners ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: Order }>('SELECT data FROM orders ORDER BY created_at DESC'),
      pool.query<{ data: StoreSettings }>("SELECT data FROM store_settings WHERE id = 'default'"),
      pool.query<{ data: AdminUser }>('SELECT data FROM admin_users ORDER BY sort_order ASC, id ASC'),
      pool.query<{ data: SecurityAuditEvent }>('SELECT data FROM security_logs ORDER BY created_at DESC LIMIT 300'),
      pool.query<{ data: SiteBackupSnapshot }>('SELECT data FROM site_backups ORDER BY created_at DESC LIMIT 30'),
      pool.query<{ data: BackupScheduleConfig }>("SELECT data FROM backup_schedule WHERE id = 'default'"),
      pool.query<{ data: SellerQuote }>('SELECT data FROM seller_quotes ORDER BY created_at DESC'),
      pool.query<{ data: SellerCustomProduct }>(
        'SELECT data FROM seller_custom_products ORDER BY sort_order ASC, id ASC'
      ),
      pool.query<{ data: MonthlySalesGoal }>(
        'SELECT data FROM monthly_sales_goals ORDER BY month_key DESC'
      ),
    ]);

    return {
      categories: cats.rows.map((r) => r.data),
      products: prods.rows.map((r) => r.data),
      deletedProducts: deletedProds.rows.map((r) => r.data),
      kits: kits.rows.map((r) => r.data),
      coupons: coupons.rows.map((r) => r.data),
      banners: banners.rows.map((r) => r.data),
      orders: orders.rows.map((r) => r.data),
      settings: settings.rows[0]?.data || INITIAL_STORE_SETTINGS,
      adminUsers: adminUsers.rows.map((r) => sanitizeAdminUserForClient(r.data)),
      securityLogs: securityLogs.rows.map((r) => r.data),
      siteBackups: siteBackups.rows.map((r) => r.data),
      backupSchedule: backupSchedule.rows[0]?.data || DEFAULT_BACKUP_SCHEDULE,
      sellerQuotes: sellerQuotes.rows.map((r) => r.data),
      sellerCustomProducts: sellerCustomProducts.rows.map((r) => r.data),
      monthlySalesGoals: monthlySalesGoals.rows.map((r) => r.data),
    };
  }

  public async getStoredAdminUsers(): Promise<StoredAdminUserRecord[]> {
    if (this.mode === 'local_file') {
      return this.localData!.adminUsers;
    }
    const res = await this.pool!.query<{ data: AdminUser; password_hash: string }>(
      'SELECT data, password_hash FROM admin_users ORDER BY sort_order ASC, id ASC'
    );
    return res.rows.map((row) => ({
      ...row.data,
      password: '',
      passwordHash: row.password_hash || '',
    }));
  }

  public async findAdminUserById(id: string): Promise<StoredAdminUserRecord | null> {
    const users = await this.getStoredAdminUsers();
    return users.find((u) => u.id === id) || null;
  }

  public async claimInitialMasterPassword(
    username: string,
    plainPassword: string
  ): Promise<StoredAdminUserRecord> {
    const cleanUser = normalizeUsername(username) || 'admin';
    const hashed = hashPassword(plainPassword);
    const nowIso = new Date().toISOString();

    if (this.mode === 'local_file') {
      const d = this.localData!;
      const existingMaster = d.adminUsers.find((u) => u.role === 'master');
      if (existingMaster && isHashedPassword(existingMaster.passwordHash)) {
        throw new Error('ALREADY_CLAIMED');
      }
      const nextMaster: StoredAdminUserRecord = existingMaster
        ? {
            ...existingMaster,
            username: cleanUser,
            password: '',
            passwordHash: hashed,
            active: true,
            lastLoginAt: nowIso,
          }
        : {
            ...createInitialMasterUserRecord(),
            username: cleanUser,
            passwordHash: hashed,
            lastLoginAt: nowIso,
          };
      d.adminUsers = [
        nextMaster,
        ...d.adminUsers.filter((u) => u.id !== nextMaster.id),
      ];
      this.flushLocalStore();
      return nextMaster;
    }

    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query<{ id: string; password_hash: string; data: AdminUser }>(
        "SELECT id, password_hash, data FROM admin_users WHERE role = 'master' ORDER BY sort_order ASC LIMIT 1 FOR UPDATE"
      );

      if (existing.rows.length > 0 && isHashedPassword(existing.rows[0].password_hash)) {
        await client.query('ROLLBACK');
        throw new Error('ALREADY_CLAIMED');
      }

      const masterRecord: StoredAdminUserRecord =
        existing.rows.length > 0
          ? {
              ...existing.rows[0].data,
              username: cleanUser,
              password: '',
              passwordHash: hashed,
              active: true,
              lastLoginAt: nowIso,
            }
          : {
              ...createInitialMasterUserRecord(),
              username: cleanUser,
              passwordHash: hashed,
              lastLoginAt: nowIso,
            };

      await client.query(
        `INSERT INTO admin_users (id, username, role, active, password_hash, sort_order, data, updated_at)
         VALUES ($1, $2, 'master', TRUE, $3, 0, $4::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           active = TRUE,
           password_hash = EXCLUDED.password_hash,
           data = EXCLUDED.data,
           updated_at = NOW()`,
        [
          masterRecord.id,
          masterRecord.username,
          masterRecord.passwordHash,
          JSON.stringify(stripPasswordFromAdminRecord(masterRecord)),
        ]
      );

      await client.query('COMMIT');
      return masterRecord;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  public async recordAdminLastLogin(userId: string): Promise<void> {
    const nowIso = new Date().toISOString();
    if (this.mode === 'local_file') {
      const d = this.localData!;
      d.adminUsers = d.adminUsers.map((u) =>
        u.id === userId ? { ...u, lastLoginAt: nowIso } : u
      );
      this.flushLocalStore();
      return;
    }

    await this.pool!.query(
      `UPDATE admin_users
       SET data = jsonb_set(data, '{lastLoginAt}', to_jsonb($2::text), true),
           updated_at = NOW()
       WHERE id = $1`,
      [userId, nowIso]
    );
  }

  public async createOrder(order: Order): Promise<Order> {
    const cleanOrder: Order = {
      ...order,
      id: String(order.id || '').trim() || `#LMP-${Date.now().toString().slice(-4)}`,
      createdAt: safeTimestamp(order.createdAt),
    };

    if (this.mode === 'local_file') {
      const d = this.localData!;
      const exists = d.orders.some((o) => o.id === cleanOrder.id);
      if (exists) {
        const suffix = Math.floor(1000 + Math.random() * 9000);
        cleanOrder.id = `#LMP-${suffix}`;
      }
      d.orders = [cleanOrder, ...d.orders];
      this.flushLocalStore();
      return cleanOrder;
    }

    const pool = this.pool!;
    const existing = await pool.query('SELECT id FROM orders WHERE id = $1', [cleanOrder.id]);
    if (existing.rows.length > 0) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      cleanOrder.id = `#LMP-${suffix}`;
    }

    await pool.query(
      `INSERT INTO orders (id, customer_name, customer_phone, customer_phone_digits, status, delivery_type, total, created_at, data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::jsonb, NOW())`,
      [
        cleanOrder.id,
        cleanOrder.customerName || '',
        cleanOrder.customerPhone || '',
        normalizePhoneDigits(cleanOrder.customerPhone || ''),
        cleanOrder.status || 'received',
        cleanOrder.deliveryType || 'pickup',
        Number(cleanOrder.total) || 0,
        safeTimestamp(cleanOrder.createdAt),
        JSON.stringify(cleanOrder),
      ]
    );

    return cleanOrder;
  }

  public async lookupOrdersByPhone(phoneRaw: string, orderIdRaw?: string): Promise<Order[]> {
    const phoneDigits = normalizePhoneDigits(phoneRaw);
    if (phoneDigits.length < 10) return [];
    const normalizedOrderId = orderIdRaw
      ? String(orderIdRaw).trim().toUpperCase().replace(/^#?/, '#')
      : '';

    if (this.mode === 'local_file') {
      return this.localData!.orders.filter((o) => {
        const matchesPhone = normalizePhoneDigits(o.customerPhone) === phoneDigits;
        if (!matchesPhone) return false;
        if (!normalizedOrderId) return true;
        return o.id.toUpperCase() === normalizedOrderId;
      });
    }

    if (normalizedOrderId) {
      const res = await this.pool!.query<{ data: Order }>(
        `SELECT data FROM orders
         WHERE customer_phone_digits = $1 AND UPPER(id) = $2
         ORDER BY created_at DESC`,
        [phoneDigits, normalizedOrderId]
      );
      return res.rows.map((r) => r.data);
    }

    const res = await this.pool!.query<{ data: Order }>(
      `SELECT data FROM orders
       WHERE customer_phone_digits = $1
       ORDER BY created_at DESC`,
      [phoneDigits]
    );
    return res.rows.map((r) => r.data);
  }

  public async saveCollection(collection: AdminCollectionName, payload: unknown): Promise<void> {
    if (this.mode === 'local_file') {
      this.saveCollectionLocal(collection, payload);
      return;
    }
    await this.saveCollectionPostgres(collection, payload);
  }

  private saveCollectionLocal(collection: AdminCollectionName, payload: unknown): void {
    const d = this.localData!;
    switch (collection) {
      case 'categories':
        d.categories = Array.isArray(payload) ? (payload as Category[]) : d.categories;
        break;
      case 'products':
        d.products = Array.isArray(payload) ? (payload as Product[]) : d.products;
        break;
      case 'deletedProducts':
        d.deletedProducts = Array.isArray(payload) ? (payload as DeletedProductEntry[]) : [];
        break;
      case 'kits':
        d.kits = Array.isArray(payload) ? (payload as PromoKit[]) : d.kits;
        break;
      case 'coupons':
        d.coupons = Array.isArray(payload) ? (payload as PromoCoupon[]) : d.coupons;
        break;
      case 'banners':
        d.banners = Array.isArray(payload) ? (payload as PromoBanner[]) : d.banners;
        break;
      case 'orders':
        d.orders = Array.isArray(payload) ? (payload as Order[]) : d.orders;
        break;
      case 'settings':
        if (payload && typeof payload === 'object') {
          d.settings = { ...INITIAL_STORE_SETTINGS, ...(payload as StoreSettings) };
        }
        break;
      case 'adminUsers': {
        if (!Array.isArray(payload)) break;
        const incoming = payload as AdminUser[];
        const existingById = new Map(d.adminUsers.map((u) => [u.id, u]));
        const nextUsers: StoredAdminUserRecord[] = incoming.map((u) => {
          const prev = existingById.get(u.id);
          let nextHash = prev?.passwordHash || '';
          if (typeof u.password === 'string' && u.password.trim().length > 0) {
            nextHash = isHashedPassword(u.password) ? u.password : hashPassword(u.password.trim());
          }
          return {
            ...stripPasswordFromAdminRecord(u),
            passwordHash: nextHash,
          };
        });
        // Never allow removing the last active Master user
        if (nextUsers.some((u) => u.role === 'master' && u.active)) {
          d.adminUsers = nextUsers;
        }
        break;
      }
      case 'securityLogs':
        d.securityLogs = Array.isArray(payload)
          ? (payload as SecurityAuditEvent[]).slice(0, 300)
          : [];
        break;
      case 'siteBackups':
        d.siteBackups = Array.isArray(payload)
          ? (payload as SiteBackupSnapshot[]).slice(0, 30)
          : [];
        break;
      case 'backupSchedule':
        if (payload && typeof payload === 'object') {
          d.backupSchedule = { ...DEFAULT_BACKUP_SCHEDULE, ...(payload as BackupScheduleConfig) };
        }
        break;
      case 'sellerQuotes':
        d.sellerQuotes = Array.isArray(payload) ? (payload as SellerQuote[]) : [];
        break;
      case 'sellerCustomProducts':
        d.sellerCustomProducts = Array.isArray(payload)
          ? (payload as SellerCustomProduct[])
          : [];
        break;
      case 'monthlySalesGoals':
        d.monthlySalesGoals = Array.isArray(payload) ? (payload as MonthlySalesGoal[]) : [];
        break;
    }
    this.flushLocalStore();
  }

  private async saveCollectionPostgres(
    collection: AdminCollectionName,
    payload: unknown
  ): Promise<void> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');

      switch (collection) {
        case 'categories': {
          const items = Array.isArray(payload) ? (payload as Category[]) : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM categories');
          } else {
            await client.query('DELETE FROM categories WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (let i = 0; i < items.length; i++) {
            const c = items[i];
            await client.query(
              `INSERT INTO categories (id, name, short_name, sort_order, data, updated_at)
               VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 short_name = EXCLUDED.short_name,
                 sort_order = EXCLUDED.sort_order,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [c.id, c.name, c.shortName || '', c.order ?? i + 1, JSON.stringify(c)]
            );
          }
          break;
        }
        case 'products': {
          const items = Array.isArray(payload) ? (payload as Product[]) : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM products');
          } else {
            await client.query('DELETE FROM products WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (let i = 0; i < items.length; i++) {
            const p = items[i];
            await client.query(
              `INSERT INTO products (id, sku, category_id, title, status, price, promo_price, show_price, featured, sort_order, data, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 sku = EXCLUDED.sku,
                 category_id = EXCLUDED.category_id,
                 title = EXCLUDED.title,
                 status = EXCLUDED.status,
                 price = EXCLUDED.price,
                 promo_price = EXCLUDED.promo_price,
                 show_price = EXCLUDED.show_price,
                 featured = EXCLUDED.featured,
                 sort_order = EXCLUDED.sort_order,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [
                p.id,
                p.sku || '',
                p.categoryId || '',
                p.title,
                p.status || 'active',
                Number(p.price) || 0,
                p.promoPrice != null ? Number(p.promoPrice) : null,
                Boolean(p.showPrice),
                Boolean(p.featured),
                i,
                JSON.stringify(p),
              ]
            );
          }
          break;
        }
        case 'deletedProducts': {
          const items = Array.isArray(payload) ? (payload as DeletedProductEntry[]) : [];
          const ids = items.map((entry) => entry.product.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM deleted_products');
          } else {
            await client.query('DELETE FROM deleted_products WHERE NOT (id = ANY($1::text[]))', [
              ids,
            ]);
          }
          for (const entry of items) {
            await client.query(
              `INSERT INTO deleted_products (id, sku, deleted_at, data, updated_at)
               VALUES ($1, $2, $3::timestamptz, $4::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 sku = EXCLUDED.sku,
                 deleted_at = EXCLUDED.deleted_at,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [
                entry.product.id,
                entry.product.sku || '',
                safeTimestamp(entry.deletedAt),
                JSON.stringify(entry),
              ]
            );
          }
          break;
        }
        case 'kits': {
          const items = Array.isArray(payload) ? (payload as PromoKit[]) : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM promo_kits');
          } else {
            await client.query('DELETE FROM promo_kits WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (let i = 0; i < items.length; i++) {
            const k = items[i];
            await client.query(
              `INSERT INTO promo_kits (id, sku, title, active, sort_order, data, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 sku = EXCLUDED.sku,
                 title = EXCLUDED.title,
                 active = EXCLUDED.active,
                 sort_order = EXCLUDED.sort_order,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [k.id, k.sku || '', k.title, Boolean(k.active), i, JSON.stringify(k)]
            );
          }
          break;
        }
        case 'coupons': {
          const items = Array.isArray(payload) ? (payload as PromoCoupon[]) : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM promo_coupons');
          } else {
            await client.query('DELETE FROM promo_coupons WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (let i = 0; i < items.length; i++) {
            const c = items[i];
            await client.query(
              `INSERT INTO promo_coupons (id, code, active, sort_order, data, updated_at)
               VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 code = EXCLUDED.code,
                 active = EXCLUDED.active,
                 sort_order = EXCLUDED.sort_order,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [c.id, c.code, Boolean(c.active), i, JSON.stringify(c)]
            );
          }
          break;
        }
        case 'banners': {
          const items = Array.isArray(payload) ? (payload as PromoBanner[]) : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM promo_banners');
          } else {
            await client.query('DELETE FROM promo_banners WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (let i = 0; i < items.length; i++) {
            const b = items[i];
            await client.query(
              `INSERT INTO promo_banners (id, title, active, sort_order, data, updated_at)
               VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 title = EXCLUDED.title,
                 active = EXCLUDED.active,
                 sort_order = EXCLUDED.sort_order,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [b.id, b.title, Boolean(b.active), b.order ?? i + 1, JSON.stringify(b)]
            );
          }
          break;
        }
        case 'orders': {
          const items = Array.isArray(payload) ? (payload as Order[]) : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM orders');
          } else {
            await client.query('DELETE FROM orders WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (const o of items) {
            await client.query(
              `INSERT INTO orders (id, customer_name, customer_phone, customer_phone_digits, status, delivery_type, total, created_at, data, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 customer_name = EXCLUDED.customer_name,
                 customer_phone = EXCLUDED.customer_phone,
                 customer_phone_digits = EXCLUDED.customer_phone_digits,
                 status = EXCLUDED.status,
                 delivery_type = EXCLUDED.delivery_type,
                 total = EXCLUDED.total,
                 created_at = EXCLUDED.created_at,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [
                o.id,
                o.customerName || '',
                o.customerPhone || '',
                normalizePhoneDigits(o.customerPhone || ''),
                o.status || 'received',
                o.deliveryType || 'pickup',
                Number(o.total) || 0,
                safeTimestamp(o.createdAt),
                JSON.stringify(o),
              ]
            );
          }
          break;
        }
        case 'settings': {
          const nextSettings = {
            ...INITIAL_STORE_SETTINGS,
            ...(payload && typeof payload === 'object' ? (payload as StoreSettings) : {}),
          };
          await client.query(
            `INSERT INTO store_settings (id, data, updated_at)
             VALUES ('default', $1::jsonb, NOW())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
            [JSON.stringify(nextSettings)]
          );
          break;
        }
        case 'adminUsers': {
          const items = Array.isArray(payload) ? (payload as AdminUser[]) : [];
          if (!items.some((u) => u.role === 'master' && u.active)) {
            throw new Error('At least one active Master admin user is required.');
          }
          const existingRows = await client.query<{ id: string; password_hash: string }>(
            'SELECT id, password_hash FROM admin_users'
          );
          const hashById = new Map(existingRows.rows.map((r) => [r.id, r.password_hash || '']));
          const ids = items.map((i) => i.id);
          await client.query('DELETE FROM admin_users WHERE NOT (id = ANY($1::text[]))', [ids]);

          for (let i = 0; i < items.length; i++) {
            const u = items[i];
            let nextHash = hashById.get(u.id) || '';
            if (typeof u.password === 'string' && u.password.trim().length > 0) {
              nextHash = isHashedPassword(u.password) ? u.password : hashPassword(u.password.trim());
            }
            const cleanUser = stripPasswordFromAdminRecord(u);
            await client.query(
              `INSERT INTO admin_users (id, username, role, active, password_hash, sort_order, data, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 username = EXCLUDED.username,
                 role = EXCLUDED.role,
                 active = EXCLUDED.active,
                 password_hash = EXCLUDED.password_hash,
                 sort_order = EXCLUDED.sort_order,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [
                cleanUser.id,
                cleanUser.username,
                cleanUser.role,
                Boolean(cleanUser.active),
                nextHash,
                i,
                JSON.stringify(cleanUser),
              ]
            );
          }
          break;
        }
        case 'securityLogs': {
          const items = Array.isArray(payload)
            ? (payload as SecurityAuditEvent[]).slice(0, 300)
            : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM security_logs');
          } else {
            await client.query('DELETE FROM security_logs WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (const ev of items) {
            await client.query(
              `INSERT INTO security_logs (id, category, outcome, created_at, data)
               VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
               ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
              [
                ev.id,
                ev.category || 'system',
                ev.outcome || 'info',
                safeTimestamp(ev.timestamp),
                JSON.stringify(ev),
              ]
            );
          }
          break;
        }
        case 'siteBackups': {
          const items = Array.isArray(payload)
            ? (payload as SiteBackupSnapshot[]).slice(0, 30)
            : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM site_backups');
          } else {
            await client.query('DELETE FROM site_backups WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (const snap of items) {
            await client.query(
              `INSERT INTO site_backups (id, date_key, trigger_type, created_at, data)
               VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb)
               ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
              [
                snap.id,
                snap.dateKey || '',
                snap.trigger || 'manual',
                safeTimestamp(snap.createdAt),
                JSON.stringify(snap),
              ]
            );
          }
          break;
        }
        case 'backupSchedule': {
          const nextSchedule = {
            ...DEFAULT_BACKUP_SCHEDULE,
            ...(payload && typeof payload === 'object' ? (payload as BackupScheduleConfig) : {}),
          };
          await client.query(
            `INSERT INTO backup_schedule (id, data, updated_at)
             VALUES ('default', $1::jsonb, NOW())
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
            [JSON.stringify(nextSchedule)]
          );
          break;
        }
        case 'sellerQuotes': {
          const items = Array.isArray(payload) ? (payload as SellerQuote[]) : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM seller_quotes');
          } else {
            await client.query('DELETE FROM seller_quotes WHERE NOT (id = ANY($1::text[]))', [ids]);
          }
          for (const q of items) {
            await client.query(
              `INSERT INTO seller_quotes (id, code, seller_username, status, created_at, data, updated_at)
               VALUES ($1, $2, $3, $4, $5::timestamptz, $6::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 code = EXCLUDED.code,
                 seller_username = EXCLUDED.seller_username,
                 status = EXCLUDED.status,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [
                q.id,
                q.id || '',
                q.sellerUsername || '',
                q.status || 'draft',
                safeTimestamp(q.createdAt),
                JSON.stringify(q),
              ]
            );
          }
          break;
        }
        case 'sellerCustomProducts': {
          const items = Array.isArray(payload) ? (payload as SellerCustomProduct[]) : [];
          const ids = items.map((i) => i.id);
          if (ids.length === 0) {
            await client.query('DELETE FROM seller_custom_products');
          } else {
            await client.query(
              'DELETE FROM seller_custom_products WHERE NOT (id = ANY($1::text[]))',
              [ids]
            );
          }
          for (let i = 0; i < items.length; i++) {
            const p = items[i];
            await client.query(
              `INSERT INTO seller_custom_products (id, sku, title, sort_order, data, updated_at)
               VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 sku = EXCLUDED.sku,
                 title = EXCLUDED.title,
                 sort_order = EXCLUDED.sort_order,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [p.id, p.sku || '', p.title || '', i, JSON.stringify(p)]
            );
          }
          break;
        }
        case 'monthlySalesGoals': {
          const items = Array.isArray(payload) ? (payload as MonthlySalesGoal[]) : [];
          const keys = items.map((i) => i.monthKey);
          if (keys.length === 0) {
            await client.query('DELETE FROM monthly_sales_goals');
          } else {
            await client.query(
              'DELETE FROM monthly_sales_goals WHERE NOT (month_key = ANY($1::text[]))',
              [keys]
            );
          }
          for (const g of items) {
            await client.query(
              `INSERT INTO monthly_sales_goals (month_key, revenue_target, orders_target, data, updated_at)
               VALUES ($1, $2, $3, $4::jsonb, NOW())
               ON CONFLICT (month_key) DO UPDATE SET
                 revenue_target = EXCLUDED.revenue_target,
                 orders_target = EXCLUDED.orders_target,
                 data = EXCLUDED.data,
                 updated_at = NOW()`,
              [
                g.monthKey,
                Number(g.revenueTarget) || 0,
                Math.round(Number(g.ordersTarget) || 0),
                JSON.stringify(g),
              ]
            );
          }
          break;
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async restoreFullBackup(payload: SiteBackupPayload): Promise<void> {
    if (Array.isArray(payload.categories)) {
      await this.saveCollection('categories', payload.categories);
    }
    if (Array.isArray(payload.products)) {
      await this.saveCollection('products', payload.products);
    }
    if (Array.isArray(payload.deletedProducts)) {
      await this.saveCollection('deletedProducts', payload.deletedProducts);
    }
    if (Array.isArray(payload.kits)) {
      await this.saveCollection('kits', payload.kits);
    }
    if (Array.isArray(payload.coupons)) {
      await this.saveCollection('coupons', payload.coupons);
    }
    if (Array.isArray(payload.banners)) {
      await this.saveCollection('banners', payload.banners);
    }
    if (Array.isArray(payload.orders)) {
      await this.saveCollection('orders', payload.orders);
    }
    if (payload.settings && typeof payload.settings === 'object') {
      await this.saveCollection('settings', payload.settings);
    }
    if (
      Array.isArray(payload.adminUsers) &&
      payload.adminUsers.some((u) => u.role === 'master' && u.active)
    ) {
      await this.saveCollection('adminUsers', payload.adminUsers);
    }
  }

  public async getDatabaseStatus(): Promise<DatabaseStatusInfo> {
    const start = Date.now();
    if (this.mode === 'local_file') {
      const d = this.localData!;
      return {
        engine: 'local_file',
        connected: true,
        schemaVersion: DB_SCHEMA_VERSION,
        seedCompletedAt: this.seedCompletedAt,
        nonDestructiveMigrations: true,
        latencyMs: Date.now() - start,
        counts: {
          categories: d.categories.length,
          products: d.products.length,
          orders: d.orders.length,
          kits: d.kits.length,
          coupons: d.coupons.length,
          banners: d.banners.length,
          adminUsers: d.adminUsers.length,
          sellerQuotes: d.sellerQuotes.length,
          siteBackups: d.siteBackups.length,
        },
      };
    }

    try {
      const res = await this.pool!.query<{
        categories: string;
        products: string;
        orders: string;
        kits: string;
        coupons: string;
        banners: string;
        admin_users: string;
        seller_quotes: string;
        site_backups: string;
      }>(`
        SELECT
          (SELECT COUNT(*) FROM categories) AS categories,
          (SELECT COUNT(*) FROM products) AS products,
          (SELECT COUNT(*) FROM orders) AS orders,
          (SELECT COUNT(*) FROM promo_kits) AS kits,
          (SELECT COUNT(*) FROM promo_coupons) AS coupons,
          (SELECT COUNT(*) FROM promo_banners) AS banners,
          (SELECT COUNT(*) FROM admin_users) AS admin_users,
          (SELECT COUNT(*) FROM seller_quotes) AS seller_quotes,
          (SELECT COUNT(*) FROM site_backups) AS site_backups
      `);
      const row = res.rows[0];
      return {
        engine: 'postgresql',
        connected: true,
        schemaVersion: DB_SCHEMA_VERSION,
        seedCompletedAt: this.seedCompletedAt,
        nonDestructiveMigrations: true,
        latencyMs: Date.now() - start,
        counts: {
          categories: Number(row?.categories || 0),
          products: Number(row?.products || 0),
          orders: Number(row?.orders || 0),
          kits: Number(row?.kits || 0),
          coupons: Number(row?.coupons || 0),
          banners: Number(row?.banners || 0),
          adminUsers: Number(row?.admin_users || 0),
          sellerQuotes: Number(row?.seller_quotes || 0),
          siteBackups: Number(row?.site_backups || 0),
        },
      };
    } catch {
      return {
        engine: 'postgresql',
        connected: false,
        schemaVersion: DB_SCHEMA_VERSION,
        seedCompletedAt: this.seedCompletedAt,
        nonDestructiveMigrations: true,
        latencyMs: null,
        counts: {
          categories: 0,
          products: 0,
          orders: 0,
          kits: 0,
          coupons: 0,
          banners: 0,
          adminUsers: 0,
          sellerQuotes: 0,
          siteBackups: 0,
        },
      };
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

export const db = new LimperDatabase();
