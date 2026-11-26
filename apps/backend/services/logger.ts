type LogLevel = 'info' | 'warn' | 'error';

interface LogMeta {
  module?: string;
  action?: string;
  uid?: string;
  referenceId?: string;
  [key: string]: unknown;
}

const REDACT_KEYS = new Set([
  'password',
  'pin',
  'otp',
  'token',
  'authorization',
  'secret',
  'servicerolekey',
  'apikey',
  'nid',
]);

function sanitizeMeta(meta?: LogMeta): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      clean[key] = '[REDACTED]';
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function writeLog(level: LogLevel, message: string, meta?: LogMeta) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(sanitizeMeta(meta) || {}),
  };
  if (level === 'error') {
    console.error(JSON.stringify(payload));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => writeLog('info', message, meta),
  warn: (message: string, meta?: LogMeta) => writeLog('warn', message, meta),
  error: (message: string, meta?: LogMeta) => writeLog('error', message, meta),
};
