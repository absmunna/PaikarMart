import { PersonalDocumentType, PersonalVerificationStatus } from '@/types';

export interface IdentityVerificationPayload {
  documentType: PersonalDocumentType;
  documentNumber: string;
  frontImage?: File;
  backImage?: File;
}

export interface IdentityVerificationResponse {
  id: string;
  status: PersonalVerificationStatus;
  documentType: PersonalDocumentType;
  documentNumber: string;
  verifiedAt?: string;
  rejectionReason?: string;
}
