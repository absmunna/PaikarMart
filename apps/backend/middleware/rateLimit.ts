import rateLimit from 'express-rate-limit';

// General API rate limiter: protects /api/* from automated floods
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: 'Too many requests. Please try again in a few minutes.',
    code: 'TOO_MANY_REQUESTS',
  },
});

// Strict auth & profile rate limiter: protects /api/auth/* endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: 'Too many authentication requests. Please wait a few minutes and try again.',
    code: 'TOO_MANY_AUTH_ATTEMPTS',
  },
});

export const podVerificationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: 'Too many delivery verification attempts. Please try again later.',
    code: 'TOO_MANY_POD_ATTEMPTS',
  },
});

// AI endpoint rate limiter
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: {
    error: 'AI rate limit reached. Please wait a minute before trying again.',
    code: 'TOO_MANY_AI_REQUESTS',
  },
});
