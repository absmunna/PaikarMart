import { useState, useCallback } from 'react';
import { IdentityVerificationPayload, IdentityVerificationResponse } from '../types';
import { submitIdentityVerification, fetchIdentityStatus } from '../services/identityApiClient';

export function useIdentityVerification() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<IdentityVerificationResponse | null>(null);

  const submit = useCallback(async (payload: IdentityVerificationPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await submitIdentityVerification(payload);
      setVerificationResult(result);
      return result;
    } catch (err: any) {
      const msg = err?.message || 'Verification submission failed.';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkStatus = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetchIdentityStatus(id);
      setVerificationResult(res);
      return res;
    } catch (err: any) {
      setError(err?.message || 'Failed to check status.');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    verificationResult,
    submit,
    checkStatus,
  };
}
