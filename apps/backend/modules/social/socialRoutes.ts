import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseAuth } from '../../middleware/requireFirebaseAuth.js';
import { getStoredFeedPosts, insertStoredPost } from '../../services/dbService.js';

export const socialRouter = Router();

const serverPosts = [
  {
    id: 'post_srv_1',
    authorName: 'PaikarMart System',
    authorAvatar:
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&h=150&q=80',
    timestamp: 'Just now',
    content:
      'Welcome to PaikarMart Social Commerce Super App! Powered by Vercel Frontend, Express API on Render, Supabase PostgreSQL, and Firebase Auth.',
    reactionsCount: { like: 12, love: 5, care: 2 },
    sharesCount: 1,
    comments: [],
  },
];

socialRouter.get('/', async (_req: Request, res: Response) => {
  const posts = await getStoredFeedPosts(serverPosts);
  res.json({ posts });
});

socialRouter.post('/post', requireFirebaseAuth, async (req: Request, res: Response) => {
  const content = String(req.body?.content || '').trim().slice(0, 2000);
  if (!content && !req.body?.mediaUrl && !req.body?.taggedProduct) {
    res.status(400).json({ error: 'Post content or media is required.' });
    return;
  }

  const newPost = {
    id: `post_${Date.now()}`,
    authorId: res.locals.auth.uid,
    authorName: String(req.body?.authorName || 'PaikarMart Member').slice(0, 100),
    authorAvatar: typeof req.body?.authorAvatar === 'string' ? req.body.authorAvatar.slice(0, 512) : undefined,
    content,
    mediaUrl: typeof req.body?.mediaUrl === 'string' ? req.body.mediaUrl.slice(0, 512) : undefined,
    timestamp: 'Just now',
    reactionsCount: { like: 0, love: 0, care: 0 },
    sharesCount: 0,
    comments: [],
  };

  await insertStoredPost(newPost);
  serverPosts.unshift(newPost);
  res.status(201).json({ success: true, post: newPost });
});
