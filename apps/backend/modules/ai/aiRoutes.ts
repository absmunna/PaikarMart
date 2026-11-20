import { Router, Request, Response } from 'express';
import { 
  generateChatbotResponse, 
  runSearchGrounding, 
  runMapsGrounding, 
  transcribeAudio 
} from './aiServices.js';

export const aiRouter = Router();

// 1. Multi-turn AI Chatbot Route
aiRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { history = [], message, role = 'general', isFastMode = false } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Valid prompt message is required.' });
    }

    const reply = await generateChatbotResponse(history, message, role, isFastMode);
    return res.json({ reply });
  } catch (error: any) {
    console.error('Error in /api/ai/chat:', error);
    return res.status(500).json({ 
      error: 'Failed to generate response.',
      details: error.message 
    });
  }
});

// 2. Google Search Grounding Route
aiRouter.post('/search-grounding', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Search prompt string is required.' });
    }

    const result = await runSearchGrounding(prompt);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/search-grounding:', error);
    return res.status(500).json({ 
      error: 'Search grounding failed.',
      details: error.message 
    });
  }
});

// 3. Google Maps Grounding Route
aiRouter.post('/maps-grounding', async (req: Request, res: Response) => {
  try {
    const { prompt, userLatLng } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Maps search prompt is required.' });
    }

    const result = await runMapsGrounding(prompt, userLatLng);
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/maps-grounding:', error);
    return res.status(500).json({ 
      error: 'Maps grounding failed.',
      details: error.message 
    });
  }
});

// 4. Audio Transcription Route (gemini-3.5-transcribe)
aiRouter.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const { base64Audio, mimeType } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ error: 'base64Audio data string is required.' });
    }

    const result = await transcribeAudio(base64Audio, mimeType || 'audio/webm');
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /api/ai/transcribe:', error);
    return res.status(500).json({ 
      error: 'Audio transcription failed.',
      details: error.message 
    });
  }
});

// 5. Citizen Classified Post Safety & AI Moderation (Fail-Safe)
aiRouter.post('/moderate-post', async (req: Request, res: Response) => {
  try {
    const { content = '', category = 'general' } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Post content string is required.' });
    }

    const lower = content.toLowerCase();
    const prohibitedKeywords = [
      'অস্ত্র', 'পিস্তল', 'বন্দুক', 'weapon', 'gun', 'explosive',
      'মাদক', 'হেরোইন', 'ড্রাগ', 'drug', 'ইয়াবা', 'গাঁজা',
      'সুদ', 'বেটিং', 'gambling', 'ক্যাসিনো', 'casino', 'পনজি স্ক্যাম', 'pyramid scheme',
      'জাল টাকা', 'হুমকি', 'fake passport', 'জাল এনআইডি'
    ];

    const flaggedKeywords = prohibitedKeywords.filter(k => lower.includes(k));

    if (flaggedKeywords.length > 0) {
      return res.json({
        isSafe: false,
        riskLevel: 'high_risk_flagged',
        reason: 'Sensitive or high-risk content detected. Held for human review.',
        flaggedKeywords,
        status: 'pending_human_review'
      });
    }

    return res.json({
      isSafe: true,
      riskLevel: 'safe',
      reason: 'Automated AI safety screening passed.',
      status: 'approved'
    });
  } catch (error: any) {
    console.error('Error in /api/ai/moderate-post:', error);
    // Fail-safe: if server-side analysis throws, hold for human review
    return res.json({
      isSafe: false,
      riskLevel: 'high_risk_flagged',
      reason: 'Moderation service error; listing held for reviewer.',
      status: 'pending_human_review'
    });
  }
});
