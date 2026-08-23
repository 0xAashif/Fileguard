import express from 'express';
import { register, login, getMe, verifyEmail } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

router.post('/register', apiLimiter, register);
router.post('/login', apiLimiter, login);
router.get('/me', protect, getMe);
router.get('/verify-email/:token', verifyEmail);

export default router;
