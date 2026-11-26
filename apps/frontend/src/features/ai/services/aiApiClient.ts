import {
  AiRole,
  ChatMessage,
  SearchGroundingResponse,
  MapsGroundingResponse,
  TranscriptionResponse,
} from '@/features/ai/types/ai';
import { apiRequest } from '@/shared/services/apiClient';

export async function sendChatMessage(
  history: ChatMessage[],
  message: string,
  role: AiRole = 'general',
  isFastMode: boolean = false
): Promise<string> {
  const formattedHistory = history.map((h) => ({
    role: h.role,
    parts: [{ text: h.text }],
  }));

  const data = await apiRequest<{ reply: string }>('/api/ai/chat', {
    method: 'POST',
    json: true,
    requireAuth: true,
    body: JSON.stringify({
      history: formattedHistory,
      message,
      role,
      isFastMode,
    }),
  });

  return data.reply;
}

export async function fetchSearchGrounding(prompt: string): Promise<SearchGroundingResponse> {
  return await apiRequest<SearchGroundingResponse>('/api/ai/search-grounding', {
    method: 'POST',
    json: true,
    requireAuth: true,
    body: JSON.stringify({ prompt }),
  });
}

export async function fetchMapsGrounding(
  prompt: string,
  userLatLng?: { latitude: number; longitude: number }
): Promise<MapsGroundingResponse> {
  return await apiRequest<MapsGroundingResponse>('/api/ai/maps-grounding', {
    method: 'POST',
    json: true,
    requireAuth: true,
    body: JSON.stringify({ prompt, userLatLng }),
  });
}

export async function transcribeVoiceAudio(
  base64Audio: string,
  mimeType: string = 'audio/webm'
): Promise<TranscriptionResponse> {
  return await apiRequest<TranscriptionResponse>('/api/ai/transcribe', {
    method: 'POST',
    json: true,
    requireAuth: true,
    body: JSON.stringify({ base64Audio, mimeType }),
  });
}
