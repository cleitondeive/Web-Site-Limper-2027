import crypto from 'node:crypto';
import type { AdminAppTab, AdminRoleLevel, AdminUser } from '../src/types/commerce.ts';

// Keep signing secret strictly in memory when SESSION_SECRET env var is not configured
const EPHEMERAL_SESSION_SECRET = crypto.randomBytes(32).toString('hex');

function getSessionSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  return envSecret && envSecret.length >= 16 ? envSecret : EPHEMERAL_SESSION_SECRET;
}

export const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export interface AdminSessionClaims {
  sub: string;
  username: string;
  role: AdminRoleLevel;
  iat: number;
  exp: number;
}

export function normalizeUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '');
}

export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function isHashedPassword(value: string): boolean {
  return typeof value === 'string' && value.startsWith('scrypt$') && value.split('$').length === 3;
}

export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  if (!plainPassword || !storedHash || !isHashedPassword(storedHash)) {
    return false;
  }
  const parts = storedHash.split('$');
  const salt = parts[1];
  const expectedHex = parts[2];
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(plainPassword, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function verifyEnvMasterPassword(plainPassword: string): boolean {
  const envPass = process.env.ADMIN_MASTER_PASSWORD?.trim();
  if (!envPass || !plainPassword) return false;
  const a = crypto.createHash('sha256').update(plainPassword).digest();
  const b = crypto.createHash('sha256').update(envPass).digest();
  return crypto.timingSafeEqual(a, b);
}

export function hasEnvMasterPassword(): boolean {
  return Boolean(process.env.ADMIN_MASTER_PASSWORD && process.env.ADMIN_MASTER_PASSWORD.trim().length > 0);
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, 'base64').toString('utf8');
}

export function createAdminSessionToken(user: Pick<AdminUser, 'id' | 'username' | 'role'>): string {
  const now = Date.now();
  const claims: AdminSessionClaims = {
    sub: user.id,
    username: normalizeUsername(user.username),
    role: user.role,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(claims));
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest();
  return `${payloadB64}.${base64UrlEncode(sig)}`;
}

export function verifyAdminSessionToken(token: string | undefined): AdminSessionClaims | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(payloadB64)
      .digest();
    const expectedB64 = base64UrlEncode(expectedSig);
    const a = Buffer.from(sigB64, 'utf8');
    const b = Buffer.from(expectedB64, 'utf8');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }
    const parsed = JSON.parse(base64UrlDecode(payloadB64)) as AdminSessionClaims;
    if (!parsed || typeof parsed.sub !== 'string' || typeof parsed.exp !== 'number') {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | undefined {
  if (!authHeader || typeof authHeader !== 'string') return undefined;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : undefined;
}

export function sanitizeAdminUserForClient(user: AdminUser): AdminUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    // Never expose plaintext or hash over HTTP responses
    password: '',
    role: user.role,
    jobTitle: user.jobTitle,
    email: user.email,
    avatarUrl: user.avatarUrl,
    allowedTabs: Array.isArray(user.allowedTabs) ? user.allowedTabs : [],
    active: Boolean(user.active),
    createdAt: user.createdAt,
    createdBy: user.createdBy,
    lastLoginAt: user.lastLoginAt,
  };
}

export const ALL_ADMIN_TABS: AdminAppTab[] = [
  'kanban',
  'sales_summary',
  'products',
  'seller_area',
  'kits',
  'banners',
  'coupons',
  'categories',
  'customers',
  'users',
  'security',
  'settings',
];

export type AdminCollectionName =
  | 'categories'
  | 'products'
  | 'deletedProducts'
  | 'kits'
  | 'coupons'
  | 'banners'
  | 'orders'
  | 'settings'
  | 'adminUsers'
  | 'securityLogs'
  | 'siteBackups'
  | 'backupSchedule'
  | 'sellerQuotes'
  | 'sellerCustomProducts'
  | 'monthlySalesGoals';

export const ALLOWED_COLLECTIONS: ReadonlySet<AdminCollectionName> = new Set([
  'categories',
  'products',
  'deletedProducts',
  'kits',
  'coupons',
  'banners',
  'orders',
  'settings',
  'adminUsers',
  'securityLogs',
  'siteBackups',
  'backupSchedule',
  'sellerQuotes',
  'sellerCustomProducts',
  'monthlySalesGoals',
]);

const COLLECTION_REQUIRED_TABS: Record<AdminCollectionName, AdminAppTab[]> = {
  categories: ['categories', 'products'],
  products: ['products'],
  deletedProducts: ['products'],
  kits: ['kits'],
  coupons: ['coupons'],
  banners: ['banners'],
  orders: ['kanban', 'customers', 'sales_summary'],
  settings: ['settings', 'products', 'security'],
  adminUsers: ['users'],
  securityLogs: ALL_ADMIN_TABS, // Any active authenticated admin action appends an audit event
  siteBackups: ['security', 'settings'],
  backupSchedule: ['security', 'settings'],
  sellerQuotes: ['seller_area'],
  sellerCustomProducts: ['seller_area'],
  monthlySalesGoals: ['sales_summary'],
};

export function canAdminUserMutateCollection(
  user: AdminUser,
  collection: AdminCollectionName
): boolean {
  if (!user.active) return false;
  if (user.role === 'master') return true;
  if (collection === 'adminUsers') return false; // Strictly Master only
  if (user.role === 'viewer' && collection !== 'securityLogs') return false;
  if (user.role === 'seller') {
    return (
      collection === 'sellerQuotes' ||
      collection === 'sellerCustomProducts' ||
      collection === 'securityLogs'
    );
  }
  const requiredTabs = COLLECTION_REQUIRED_TABS[collection];
  const userTabs = Array.isArray(user.allowedTabs) ? user.allowedTabs : [];
  return requiredTabs.some((tab) => userTabs.includes(tab));
}
