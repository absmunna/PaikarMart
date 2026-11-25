import type { NextFunction, Request, Response } from 'express';

export interface AuditLogEvent {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  actorUid: string | null;
  actorRole: string | null;
  ip: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

const MAX_AUDIT_EVENTS = 500;
const auditBuffer: AuditLogEvent[] = [];

const SENSITIVE_KEY_PATTERN =
  /password|token|secret|authorization|cookie|nid|tin|passport|dataBase64|signature|pin|otp|cvv|privateKey|serviceRole/i;

const AUDITED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const AUDITED_GET_PREFIXES = [
  '/api/auth/security-status',
  '/api/auth/audit-log',
  '/api/vendors/kyc/queue',
  '/api/wallet',
];

export function redactSensitiveFields(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[TRUNCATED]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return value.length > 180 ? `${value.slice(0, 180)}...[TRUNCATED]` : value;
  }
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactSensitiveFields(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, rawVal] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = redactSensitiveFields(rawVal, depth + 1);
    }
  }
  return out;
}

export function recordAuditEvent(event: Omit<AuditLogEvent, 'id' | 'timestamp'>): AuditLogEvent {
  const entry: AuditLogEvent = {
    id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...event,
  };
  auditBuffer.unshift(entry);
  if (auditBuffer.length > MAX_AUDIT_EVENTS) {
    auditBuffer.length = MAX_AUDIT_EVENTS;
  }
  return entry;
}

export function getRecentAuditEvents(limit = 100): AuditLogEvent[] {
  const safeLimit = Math.max(1, Math.min(250, Math.floor(limit)));
  return auditBuffer.slice(0, safeLimit);
}

export function clearAuditEvents(): void {
  auditBuffer.length = 0;
}

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  const fullPath = `${req.baseUrl || ''}${req.path || ''}` || req.originalUrl.split('?')[0];
  const shouldAudit =
    AUDITED_METHODS.has(req.method) ||
    (req.method === 'GET' && AUDITED_GET_PREFIXES.some((prefix) => fullPath.startsWith(prefix)));

  if (!shouldAudit) {
    next();
    return;
  }

  const startedAt = Date.now();
  const safeBody =
    req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0
      ? (redactSensitiveFields(req.body) as Record<string, unknown>)
      : undefined;

  res.on('finish', () => {
    const auth = res.locals?.auth;
    const forwardedFor = req.header('x-forwarded-for');
    const ip = (forwardedFor ? forwardedFor.split(',')[0].trim() : req.ip) || 'unknown';
    recordAuditEvent({
      method: req.method,
      path: fullPath,
      statusCode: res.statusCode,
      durationMs: Math.max(0, Date.now() - startedAt),
      actorUid: auth?.uid ? String(auth.uid) : null,
      actorRole: auth?.role ? String(auth.role) : null,
      ip: ip.slice(0, 64),
      userAgent: String(req.header('user-agent') || 'unknown').slice(0, 160),
      metadata: safeBody,
    });
  });

  next();
}
