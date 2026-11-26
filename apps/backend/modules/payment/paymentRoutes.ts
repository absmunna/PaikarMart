import crypto from 'crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { backendEnv, isPersistentFinanceEnabled } from '../../config/env.js';
import { requireFirebaseAuth } from '../../middleware/requireFirebaseAuth.js';
import { verifyWebhookSignature } from '../logistics/courierAdapters.js';
import { applyVerifiedPaymentWebhook } from '../wallet/walletService.js';
import { createUserNotification } from '../notifications/notificationService.js';
import { logger } from '../../services/logger.js';
import {
  clearMemoryPaymentSessionsForTest,
  createPaymentSession,
  findPaymentSessionById,
  findPaymentSessionByIdempotency,
  updatePaymentSessionCompletion,
} from './paymentRepository.js';
import type {
  PaymentProviderAdapter,
  PaymentProviderId,
  PaymentPurpose,
  PaymentSessionRecord,
} from './paymentTypes.js';
import { BkashPaymentProvider } from './providers/bkash.provider.js';
import { NagadPaymentProvider } from './providers/nagad.provider.js';
import { SslcommerzPaymentProvider } from './providers/sslcommerz.provider.js';

export const paymentRouter = Router();

const providers: Record<PaymentProviderId, PaymentProviderAdapter> = {
  bkash: new BkashPaymentProvider(),
  nagad: new NagadPaymentProvider(),
  sslcommerz: new SslcommerzPaymentProvider(),
};

function normalizeProvider(raw: unknown): PaymentProviderId | null {
  const val = String(raw || '').trim().toLowerCase();
  if (val === 'bkash' || val === 'nagad' || val === 'sslcommerz') {
    return val;
  }
  return null;
}

export function getPaymentProviderAdapter(id: PaymentProviderId): PaymentProviderAdapter {
  return providers[id];
}

export function clearPaymentSessionsForTest(): void {
  clearMemoryPaymentSessionsForTest();
}

// Public safe provider directory (exposes only availability mode, never credentials)
paymentRouter.get('/providers', (_req: Request, res: Response) => {
  const list = Object.values(providers).map((provider) => ({
    id: provider.id,
    name: provider.displayName,
    brandColor: provider.brandColor,
    channels: provider.channels,
    mode: provider.getAvailabilityMode(),
  }));

  res.json({
    success: true,
    providers: list,
  });
});

// Verified gateway webhook / IPN callback (signed via PAYMENT_WEBHOOK_SECRET; mounted before user JWT guard)
paymentRouter.post('/callback/:provider', async (req: Request, res: Response) => {
  const providerId = normalizeProvider(req.params.provider);
  if (!providerId) {
    res.status(400).json({ error: 'Unsupported payment provider.' });
    return;
  }

  if (!isPersistentFinanceEnabled()) {
    res.status(503).json({
      error: 'Payment callback processing is unavailable until persistent ledger and PAYMENT_WEBHOOK_SECRET are configured.',
    });
    return;
  }

  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  const isSignatureValid = verifyWebhookSignature({
    rawBody,
    bodyFallback: req.body,
    providedSignature: req.header('x-payment-signature') || req.header('x-webhook-signature'),
    providedSecretHeader: req.header('x-payment-secret'),
    authorizationHeader: req.header('authorization'),
    secret: backendEnv.paymentWebhookSecret,
  });

  if (!isSignatureValid) {
    res.status(401).json({ error: 'Invalid or missing payment callback signature.' });
    return;
  }

  const { sessionId, authUid, amount, referenceId, purpose } = req.body || {};
  const session = sessionId ? await findPaymentSessionById(String(sessionId)) : null;
  const resolvedUid = String(authUid || session?.uid || '').trim();
  const resolvedAmount = Number(amount ?? session?.amount ?? 0);
  const resolvedRef = String(
    req.header('x-idempotency-key') || referenceId || session?.idempotencyKey || session?.id || ''
  ).trim();

  if (!resolvedUid || !resolvedRef || !Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
    res.status(400).json({ error: 'Valid authUid, amount, and referenceId/sessionId are required.' });
    return;
  }

  const resolvedPurpose: PaymentPurpose =
    purpose === 'order_checkout' || session?.purpose === 'order_checkout'
      ? 'order_checkout'
      : 'wallet_deposit';

  if (resolvedPurpose === 'wallet_deposit') {
    try {
      const ledgerResult = await applyVerifiedPaymentWebhook({
        idempotencyKey: resolvedRef,
        authUid: resolvedUid,
        amount: resolvedAmount,
        type: 'deposit',
        method: providers[providerId].displayName,
        description: `${providers[providerId].displayName} Top-Up`,
        referenceId: resolvedRef,
      });

      if (session) {
        await updatePaymentSessionCompletion({
          sessionId: session.id,
          status: 'completed',
          trxId: resolvedRef,
        });
      }

      void createUserNotification({
        authUid: resolvedUid,
        type: 'wallet',
        title: `Wallet Credited · ৳${resolvedAmount.toLocaleString()}`,
        message: `${providers[providerId].displayName} deposit verified (Ref: ${resolvedRef}).`,
        actionTab: 'wallet',
        linkId: resolvedRef,
      });

      res.json({ success: true, provider: providerId, ...ledgerResult });
      return;
    } catch (err: any) {
      const code = err?.message || 'CALLBACK_ERROR';
      const status =
        code === 'PROFILE_NOT_FOUND'
          ? 404
          : code === 'CONCURRENT_LEDGER_CONFLICT'
          ? 409
          : 500;
      res.status(status).json({ error: code });
      return;
    }
  }

  if (session) {
    await updatePaymentSessionCompletion({
      sessionId: session.id,
      status: 'completed',
      trxId: resolvedRef,
    });
  }

  res.json({
    success: true,
    provider: providerId,
    verified: true,
    trxId: resolvedRef,
  });
});

paymentRouter.use(requireFirebaseAuth);

paymentRouter.post('/initiate', async (req: Request, res: Response) => {
  const uid = String(res.locals.auth.uid);
  const providerId = normalizeProvider(req.body?.provider);
  if (!providerId) {
    res.status(400).json({ error: 'Valid payment provider (bkash, nagad, sslcommerz) is required.' });
    return;
  }

  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 10 || amount > 5000000) {
    res.status(400).json({ error: 'Payment amount must be between ৳10 and ৳5,000,000.' });
    return;
  }

  const purpose: PaymentPurpose =
    req.body?.purpose === 'order_checkout' ? 'order_checkout' : 'wallet_deposit';
  const orderId = typeof req.body?.orderId === 'string' ? req.body.orderId.slice(0, 80) : undefined;
  const idempotencyKey =
    (req.header('x-idempotency-key') || req.body?.idempotencyKey || '').toString().trim() || undefined;

  if (idempotencyKey) {
    const existing = await findPaymentSessionByIdempotency(uid, idempotencyKey);
    if (existing) {
      res.json({ success: true, session: existing });
      return;
    }
  }

  const adapter = providers[providerId];
  const availability = adapter.getAvailabilityMode();
  if (availability === 'unavailable') {
    res.status(503).json({
      error: `${adapter.displayName} is currently unavailable because merchant credentials or sandbox mode are not configured.`,
      code: 'PROVIDER_NOT_CONFIGURED',
    });
    return;
  }

  const sessionId = `pay_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  try {
    const initResult = await adapter.initiate({
      sessionId,
      uid,
      amount,
      purpose,
      orderId,
      customerPhone: typeof req.body?.customerPhone === 'string' ? req.body.customerPhone.slice(0, 32) : undefined,
      customerName: typeof req.body?.customerName === 'string' ? req.body.customerName.slice(0, 100) : undefined,
      customerEmail: res.locals.auth.email ? String(res.locals.auth.email) : undefined,
    });

    const nowIso = new Date().toISOString();
    const record: PaymentSessionRecord = {
      id: sessionId,
      uid,
      provider: providerId,
      purpose,
      amount,
      currency: 'BDT',
      orderId,
      customerPhone: typeof req.body?.customerPhone === 'string' ? req.body.customerPhone.slice(0, 32) : undefined,
      mode: initResult.mode,
      gatewayReference: initResult.gatewayReference,
      status: 'initiated',
      idempotencyKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const persisted = await createPaymentSession(record);
    res.status(201).json({
      success: true,
      session: persisted,
      checkoutUrl: initResult.checkoutUrl,
      sandboxChallenge: initResult.sandboxChallenge,
    });
  } catch (err: any) {
    const code = err?.message || 'PROVIDER_INITIATE_FAILED';
    res.status(code === 'PROVIDER_NOT_CONFIGURED' ? 503 : 502).json({
      error: 'Unable to initiate payment session with selected gateway.',
      code,
    });
  }
});

paymentRouter.post('/verify', async (req: Request, res: Response) => {
  const uid = String(res.locals.auth.uid);
  const sessionId = String(req.body?.sessionId || '').trim();
  if (!sessionId) {
    res.status(400).json({ error: 'Payment sessionId is required.' });
    return;
  }

  const session = await findPaymentSessionById(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Payment session not found.' });
    return;
  }

  if (session.uid !== uid) {
    res.status(403).json({ error: 'Forbidden: Not authorized to verify this payment session.' });
    return;
  }

  if (session.status === 'completed') {
    res.json({
      success: true,
      alreadyVerified: true,
      session,
      trxId: session.trxId,
    });
    return;
  }

  const adapter = providers[session.provider];
  try {
    const verification = await adapter.verify({
      session,
      otp: typeof req.body?.otp === 'string' ? req.body.otp : undefined,
      pin: typeof req.body?.pin === 'string' ? req.body.pin : undefined,
      walletNumber: typeof req.body?.walletNumber === 'string' ? req.body.walletNumber : undefined,
      valId: typeof req.body?.valId === 'string' ? req.body.valId : undefined,
    });

    let walletCredit: Record<string, unknown> | undefined;
    if (session.purpose === 'wallet_deposit' && isPersistentFinanceEnabled()) {
      // Fail-closed: ledger credit MUST succeed (or return idempotent duplicate) before marking session completed
      try {
        walletCredit = await applyVerifiedPaymentWebhook({
          idempotencyKey: session.idempotencyKey || verification.trxId,
          authUid: uid,
          amount: session.amount,
          type: 'deposit',
          method: adapter.displayName,
          description: `${adapter.displayName} (${session.mode}) Deposit`,
          referenceId: verification.trxId,
        });
      } catch (ledgerErr: any) {
        const ledgerCode = ledgerErr?.message || 'LEDGER_WRITE_FAILED';
        logger.error('Payment verified at gateway but wallet ledger update failed', {
          module: 'payment',
          action: 'verify',
          uid,
          referenceId: verification.trxId,
          error: ledgerCode,
        });
        res.status(ledgerCode === 'CONCURRENT_LEDGER_CONFLICT' ? 409 : 500).json({
          error: 'Gateway payment verified, but wallet ledger update failed. Retry verification cleanly with the same sessionId.',
          code: ledgerCode,
        });
        return;
      }
    }

    const updatedSession =
      (await updatePaymentSessionCompletion({
        sessionId: session.id,
        status: 'completed',
        trxId: verification.trxId,
      })) || {
        ...session,
        status: 'completed' as const,
        trxId: verification.trxId,
        updatedAt: new Date().toISOString(),
      };

    void createUserNotification({
      authUid: uid,
      type: session.purpose === 'wallet_deposit' ? 'wallet' : 'order',
      title:
        session.purpose === 'wallet_deposit'
          ? `Deposit Verified · ৳${session.amount.toLocaleString()}`
          : `Payment Verified · ${adapter.displayName}`,
      message: `${verification.message} Ref: ${verification.trxId}`,
      actionTab: session.purpose === 'wallet_deposit' ? 'wallet' : 'orders',
      linkId: verification.trxId,
    });

    res.json({
      success: true,
      session: updatedSession,
      trxId: verification.trxId,
      message: verification.message,
      walletCredit,
    });
  } catch (err: any) {
    const code = err?.message || 'PAYMENT_VERIFICATION_FAILED';
    const statusCode =
      code === 'INVALID_GATEWAY_CREDENTIALS'
        ? 400
        : code === 'PROVIDER_NOT_CONFIGURED'
        ? 503
        : 502;
    res.status(statusCode).json({
      error:
        code === 'INVALID_GATEWAY_CREDENTIALS'
          ? 'Invalid OTP or PIN entered for payment verification.'
          : 'Payment verification failed with the gateway.',
      code,
    });
  }
});
