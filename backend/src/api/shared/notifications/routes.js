import express from 'express';
import { auth } from '../../../middlewares/authMiddleware.js';
import { registerToken, getNotificationHistory, markAsRead, sendBroadcast, getAllNotifications } from './controller.js';

const router = express.Router();

router.use(auth);

router.post('/register-token', registerToken);
router.get('/all', getAllNotifications);
router.get('/', getNotificationHistory);
router.patch('/:id/read', markAsRead);
router.post('/broadcast', sendBroadcast);

export default router;
