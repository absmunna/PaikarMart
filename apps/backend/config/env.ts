export const backendEnv = {
  port: Number(process.env.PORT || (process.env.NODE_ENV === 'production' ? 5000 : 3000)),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  corsOriginsRaw: process.env.CORS_ORIGINS || process.env.APP_URL || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0609196204',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || '',
  courierWebhookSecret: process.env.COURIER_WEBHOOK_SECRET || '',
};

export function getConfiguredCorsOrigins(): Set<string> {
  return new Set(
    backendEnv.corsOriginsRaw
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  );
}

export function isLiveDatabaseConfigured(): boolean {
  return Boolean(backendEnv.supabaseUrl && backendEnv.supabaseServiceRoleKey);
}

export function isPersistentFinanceEnabled(): boolean {
  return Boolean(isLiveDatabaseConfigured() && backendEnv.paymentWebhookSecret);
}

export function isCourierWebhookConfigured(): boolean {
  return Boolean(backendEnv.courierWebhookSecret);
}

export function isPaymentSandboxAllowed(): boolean {
  if (process.env.PAYMENT_SANDBOX_MODE === 'true') return true;
  if (process.env.PAYMENT_SANDBOX_MODE === 'false') return false;
  return process.env.NODE_ENV !== 'production';
}

export function isBkashConfigured(): boolean {
  return Boolean(
    process.env.BKASH_APP_KEY &&
      process.env.BKASH_APP_SECRET &&
      process.env.BKASH_USERNAME &&
      process.env.BKASH_PASSWORD
  );
}

export function isNagadConfigured(): boolean {
  return Boolean(
    process.env.NAGAD_MERCHANT_ID &&
      process.env.NAGAD_PUBLIC_KEY &&
      process.env.NAGAD_PRIVATE_KEY
  );
}

export function isSslcommerzConfigured(): boolean {
  return Boolean(process.env.SSLCOMMERZ_STORE_ID && process.env.SSLCOMMERZ_STORE_PASSWORD);
}

