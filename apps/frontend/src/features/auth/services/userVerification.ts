import { normalizeBdPhoneE164 } from '@/lib/firebase';

export type PasswordStrengthLevel = 'weak' | 'fair' | 'strong';

export interface PasswordStrengthResult {
  score: number;
  level: PasswordStrengthLevel;
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumberOrSymbol: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmailFormat(email?: string | null): boolean {
  if (!email) return false;
  return EMAIL_PATTERN.test(email.trim());
}

export function isValidBdPhone(phone?: string | null): boolean {
  if (!phone) return false;
  try {
    normalizeBdPhoneE164(phone);
    return true;
  } catch {
    return false;
  }
}

export function formatPhoneForDisplay(phone?: string | null): string {
  if (!phone) return '';
  try {
    const e164 = normalizeBdPhoneE164(phone);
    if (e164.startsWith('+8801') && e164.length === 14) {
      return `+880 ${e164.slice(4, 8)}-${e164.slice(8)}`;
    }
    return e164;
  } catch {
    return phone.trim();
  }
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>_\-+=]/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

  let score = 0;
  if (password.length >= 6) score += 1;
  if (hasMinLength) score += 1;
  if (hasLetter && hasNumberOrSymbol) score += 1;
  if (hasMixedCase && password.length >= 10) score += 1;

  const level: PasswordStrengthLevel =
    score >= 3 ? 'strong' : score >= 2 ? 'fair' : 'weak';

  return {
    score,
    level,
    hasMinLength,
    hasLetter,
    hasNumberOrSymbol,
  };
}

/**
 * Validates provided contact fields before guest checkout or account conversion.
 * Uniqueness enforcement is handled authoritatively by Firebase Auth & Supabase backend constraints.
 */
export const verifyUniqueUser = async (email?: string, phone?: string): Promise<boolean> => {
  const trimmedEmail = email?.trim();
  const trimmedPhone = phone?.trim();
  if (trimmedEmail && !isValidEmailFormat(trimmedEmail)) return false;
  if (trimmedPhone && !isValidBdPhone(trimmedPhone)) return false;
  return Boolean(trimmedEmail || trimmedPhone);
};

