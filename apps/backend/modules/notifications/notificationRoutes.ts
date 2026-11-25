import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireFirebaseAuth } from '../../middleware/requireFirebaseAuth.js';
import {
  clearUserNotifications,
  createUserNotification,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ServerNotificationType,
} from './notificationService.js';

export const notificationRouter = Router();

notificationRouter.use(requireFirebaseAuth);

notificationRouter.get('/', async (_req: Request, res: Response) => {
  const authUid = String(res.locals.auth.uid);
  const result = await listUserNotifications(authUid);
  res.json({
    success: true,
    ...result,
  });
});

notificationRouter.post('/', async (req: Request, res: Response) => {
  const authUid = String(res.locals.auth.uid);
  const { type, title, message, actionTab, linkId, avatar } = req.body || {};

  if (!title || !message) {
    res.status(400).json({ error: 'Notification title and message are required.' });
    return;
  }

  const allowedTypes: ServerNotificationType[] = ['order', 'booking', 'social', 'system', 'wallet'];
  const normalizedType: ServerNotificationType = allowedTypes.includes(type) ? type : 'system';

  const result = await createUserNotification({
    authUid,
    type: normalizedType,
    title: String(title),
    message: String(message),
    actionTab: typeof actionTab === 'string' ? actionTab : undefined,
    linkId: typeof linkId === 'string' ? linkId : undefined,
    avatar: typeof avatar === 'string' ? avatar : undefined,
  });

  res.status(201).json({
    success: true,
    ...result,
  });
});

notificationRouter.patch('/read-all', async (_req: Request, res: Response) => {
  const authUid = String(res.locals.auth.uid);
  await markAllNotificationsRead(authUid);
  res.json({ success: true });
});

notificationRouter.patch('/:id/read', async (req: Request, res: Response) => {
  const authUid = String(res.locals.auth.uid);
  const updated = await markNotificationRead(authUid, req.params.id);
  res.json({ success: true, updated });
});

notificationRouter.delete('/', async (_req: Request, res: Response) => {
  const authUid = String(res.locals.auth.uid);
  await clearUserNotifications(authUid);
  res.json({ success: true });
});
