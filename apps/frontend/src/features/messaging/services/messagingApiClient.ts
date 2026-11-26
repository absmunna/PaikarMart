import { apiRequest } from '@/shared/services/apiClient';
import {
  Conversation,
  MessageItem,
  ProductContext,
  QuoteOffer,
  CoPilotAction,
  CoPilotAdvice
} from '@/features/messaging/types/messaging';

export async function fetchConversationsApi(): Promise<Conversation[]> {
  const data = await apiRequest<{ conversations?: Conversation[] }>('/api/messages/conversations');
  return data.conversations || [];
}

export async function fetchThreadMessagesApi(conversationId: string): Promise<MessageItem[]> {
  const data = await apiRequest<{ messages?: MessageItem[] }>(
    `/api/messages/thread/${encodeURIComponent(conversationId)}`
  );
  return data.messages || [];
}

export async function initConversationApi(payload: {
  buyer: { id: string; name: string; avatar?: string };
  vendor: { id?: string; name: string; avatar?: string; role?: 'vendor' | 'technician' };
  productContext?: ProductContext;
  initialMessage?: string;
}): Promise<{ conversation: Conversation; messages: MessageItem[] }> {
  return await apiRequest('/api/messages/conversations/init', {
    method: 'POST',
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function sendMessageApi(payload: {
  conversationId: string;
  text: string;
  quoteOffer?: QuoteOffer;
  productContext?: ProductContext;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  role?: 'general' | 'wholesale' | 'vendor' | 'services';
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
}) {
  return await apiRequest('/api/messages/send', {
    method: 'POST',
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function requestAiCoPilotApi(payload: {
  conversationId: string;
  action: CoPilotAction;
  messages: MessageItem[];
  productContext?: ProductContext;
  userRole?: 'buyer' | 'vendor';
  targetLang?: 'bn' | 'en';
}): Promise<CoPilotAdvice> {
  return await apiRequest<CoPilotAdvice>('/api/messages/ai-copilot', {
    method: 'POST',
    json: true,
    body: JSON.stringify(payload),
  });
}

export async function updateQuoteStatusApi(
  messageId: string,
  conversationId: string,
  status: 'accepted' | 'declined'
) {
  return await apiRequest(`/api/messages/quote/${encodeURIComponent(messageId)}`, {
    method: 'PATCH',
    json: true,
    body: JSON.stringify({ conversationId, status }),
  });
}
