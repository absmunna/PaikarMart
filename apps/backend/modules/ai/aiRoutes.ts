import { Router, Request, Response } from 'express';
import {
  generateChatbotResponse,
  runSearchGrounding,
  runMapsGrounding,
  transcribeAudio
} from './aiServices.js';
import { requireFirebaseAuth, requireRole } from '../../middleware/requireFirebaseAuth.js';
import { logger } from '../../services/logger.js';
import {
  enqueueFlaggedPost,
  listFlaggedPosts,
  reviewFlaggedPostRecord,
  type FlaggedPostRecord,
} from './moderationRepository.js';

export const aiRouter = Router();

// 1. Multi-turn AI Chatbot Route
aiRouter.post('/chat', requireFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { history = [], message, role = 'general', isFastMode = false } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Valid prompt message is required.' });
    }

    const reply = await generateChatbotResponse(history, message, role, isFastMode);
    return res.json({ reply });
  } catch (error: any) {
    logger.error('ai.chat_failed', { module: 'ai', error: error?.message || String(error) });
    return res.status(500).json({ 
      error: 'Failed to generate response.',
      details: error.message 
    });
  }
});

// 2. Google Search Grounding Route
aiRouter.post('/search-grounding', requireFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Search prompt string is required.' });
    }

    const result = await runSearchGrounding(prompt);
    return res.json(result);
  } catch (error: any) {
    logger.error('ai.search_grounding_failed', { module: 'ai', error: error?.message || String(error) });
    return res.status(500).json({ 
      error: 'Search grounding failed.',
      details: error.message 
    });
  }
});

// 3. Google Maps Grounding Route
aiRouter.post('/maps-grounding', requireFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { prompt, userLatLng } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Maps search prompt is required.' });
    }

    const result = await runMapsGrounding(prompt, userLatLng);
    return res.json(result);
  } catch (error: any) {
    logger.error('ai.maps_grounding_failed', { module: 'ai', error: error?.message || String(error) });
    return res.status(500).json({ 
      error: 'Maps grounding failed.',
      details: error.message 
    });
  }
});

// 4. Audio Transcription Route (gemini-3.5-transcribe)
aiRouter.post('/transcribe', requireFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const { base64Audio, mimeType } = req.body;
    if (!base64Audio) {
      return res.status(400).json({ error: 'base64Audio data string is required.' });
    }

    const result = await transcribeAudio(base64Audio, mimeType || 'audio/webm');
    return res.json(result);
  } catch (error: any) {
    logger.error('ai.transcribe_failed', { module: 'ai', error: error?.message || String(error) });
    return res.status(500).json({ 
      error: 'Audio transcription failed.',
      details: error.message 
    });
  }
});

// 5. Citizen Classified Post Safety & AI Moderation (Fail-Safe)
aiRouter.post('/moderate-post', requireFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const rawContent = req.body?.content;
    if (!rawContent || typeof rawContent !== 'string') {
      return res.status(400).json({ error: 'Post content string is required.' });
    }

    const content = rawContent.slice(0, 5000);
    const lower = content.toLowerCase();
    const prohibitedKeywords = [
      'অস্ত্র', 'পিস্তল', 'বন্দুক', 'weapon', 'gun', 'explosive',
      'মাদক', 'হেরোইন', 'ড্রাগ', 'drug', 'ইয়াবা', 'গাঁজা',
      'সুদ', 'বেটিং', 'gambling', 'ক্যাসিনো', 'casino', 'পনজি স্ক্যাম', 'pyramid scheme',
      'জাল টাকা', 'হুমকি', 'fake passport', 'জাল এনআইডি'
    ];

    const flaggedKeywords = prohibitedKeywords.filter((k) => lower.includes(k));

    if (flaggedKeywords.length > 0) {
      const queueItem: FlaggedPostRecord = {
        id: `mod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        authorUid: String(res.locals.auth?.uid || 'unknown'),
        contentExcerpt: content.slice(0, 240),
        flaggedKeywords,
        status: 'pending_human_review',
        createdAt: new Date().toISOString(),
      };
      const saved = await enqueueFlaggedPost(queueItem);

      return res.json({
        isSafe: false,
        riskLevel: 'high_risk_flagged',
        reason: 'Sensitive or high-risk content detected. Held for human review.',
        flaggedKeywords,
        status: 'pending_human_review',
        moderationId: saved.id,
      });
    }

    return res.json({
      isSafe: true,
      riskLevel: 'safe',
      reason: 'Automated AI safety screening passed.',
      status: 'approved',
    });
  } catch (error: any) {
    logger.error('ai.moderate_post_failed', { module: 'ai', error: error?.message || String(error) });
    return res.json({
      isSafe: false,
      riskLevel: 'high_risk_flagged',
      reason: 'Moderation service error; listing held for reviewer.',
      status: 'pending_human_review',
    });
  }
});

// 6. Moderator/Admin Queue for Flagged Citizen Posts
aiRouter.get('/moderation/posts', requireFirebaseAuth, requireRole(['moderator', 'admin', 'super_admin']), async (_req: Request, res: Response) => {
  try {
    const posts = await listFlaggedPosts();
    return res.json({
      success: true,
      posts,
    });
  } catch (error: any) {
    logger.error('ai.moderation_list_failed', { module: 'ai', error: error?.message || String(error) });
    return res.status(503).json({ error: 'Unable to load moderation queue.' });
  }
});

aiRouter.patch('/moderation/posts/:id/review', requireFirebaseAuth, requireRole(['moderator', 'admin', 'super_admin']), async (req: Request, res: Response) => {
  const decision = req.body?.decision === 'approved' ? 'approved' : req.body?.decision === 'rejected' ? 'rejected' : null;
  if (!decision) {
    return res.status(400).json({ error: 'Decision must be approved or rejected.' });
  }

  try {
    const updated = await reviewFlaggedPostRecord({
      id: String(req.params.id),
      decision,
      reviewedBy: String(res.locals.auth?.email || res.locals.auth?.uid),
    });
    if (!updated) {
      return res.status(404).json({ error: 'Flagged post record not found.' });
    }
    return res.json({ success: true, post: updated });
  } catch (error: any) {
    logger.error('ai.moderation_review_failed', { module: 'ai', error: error?.message || String(error) });
    return res.status(503).json({ error: 'Unable to update moderation decision.' });
  }
});
