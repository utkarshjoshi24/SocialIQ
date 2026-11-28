import { Router } from 'express';
import { register, login, getMe, updateMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

const router = Router();

const LIMIT_WINDOW_MS = 15 * 60 * 1000;
const LIMIT_MESSAGE = 'Too many failed attempts. Please wait a few minutes and try again.';

// 10 failed logins per 15 minutes per IP + email (password guessing on one account)
const loginLimiter = rateLimit({
  windowMs: LIMIT_WINDOW_MS,
  max: 10,
  message: LIMIT_MESSAGE,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${req.ip}|${email}`;
  },
});

// 20 failed registrations per 15 minutes per IP (e.g. email enumeration)
const registerLimiter = rateLimit({ windowMs: LIMIT_WINDOW_MS, max: 20, message: LIMIT_MESSAGE });

// Public routes
router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);

export default router;
