import { B2BPaymentTerms, PurchaseOrderDraft, WholesaleSampleOrder } from '@/features/b2b/types/b2bTypes';
import { apiRequest } from '@/shared/services/apiClient';

export async function fetchWholesaleRFQsApi(): Promise<PurchaseOrderDraft[]> {
  const data = await apiRequest<{ rfqs?: PurchaseOrderDraft[] }>('/api/wholesale/rfqs');
  return data.rfqs || [];
}

export async function submitWholesaleRFQApi(payload: {
  productId: string;
  productName: string;
  quantity: number;
  targetPrice?: number;
  baseUnitPrice?: number;
  deliveryDistrict: string;
  paymentTerms?: B2BPaymentTerms;
  notes?: string;
  buyerName: string;
  buyerPhone: string;
  buyerCompany: string;
  email?: string;
}): Promise<{ rfqId: string; poDraft: PurchaseOrderDraft }> {
  return await apiRequest('/api/wholesale/rfq', {
    method: 'POST',
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function updateWholesaleRFQStatusApi(
  id: string,
  payload: { status?: string; counterPrice?: number; comments?: string; escrowId?: string }
): Promise<{ poDraft: PurchaseOrderDraft }> {
  return await apiRequest(`/api/wholesale/rfq/${encodeURIComponent(id)}/respond`, {
    method: 'POST',
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function fetchWholesaleSamplesApi(): Promise<WholesaleSampleOrder[]> {
  const data = await apiRequest<{ samples?: WholesaleSampleOrder[] }>('/api/wholesale/samples');
  return data.samples || [];
}

export async function submitWholesaleSampleApi(payload: {
  productId: string;
  productTitle: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  shippingAddress: string;
  sampleFee?: number;
}): Promise<{ sample: WholesaleSampleOrder }> {
  return await apiRequest('/api/wholesale/sample', {
    method: 'POST',
    json: true,
    body: JSON.stringify(payload),
  });
}
