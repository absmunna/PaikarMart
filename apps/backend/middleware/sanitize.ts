import type { NextFunction, Request, Response } from 'express';

const SKIP_BINARY_KEYS = new Set([
  'base64Audio',
  'photoDataUrl',
  'signatureDataUrl',
  'rawBody',
]);

function sanitizeString(value: string): string {
  return value
    .replace(/\0/g, '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '');
}

function sanitizeValue(input: unknown, keyName?: string, depth = 0): unknown {
  if (depth > 12 || (keyName && SKIP_BINARY_KEYS.has(keyName))) {
    return input;
  }
  if (typeof input === 'string') {
    return sanitizeString(input);
  }
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeValue(item, undefined, depth + 1));
  }
  if (input !== null && typeof input === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        continue;
      }
      clean[k] = sanitizeValue(v, k, depth + 1);
    }
    return clean;
  }
  return input;
}

export function sanitizeApiInputs(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    const cleanQuery = sanitizeValue(req.query) as Record<string, any>;
    for (const [key, val] of Object.entries(cleanQuery)) {
      (req.query as Record<string, any>)[key] = val;
    }
  }
  next();
}
