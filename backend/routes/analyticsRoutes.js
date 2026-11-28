import express from 'express';
import { protect } from '../middleware/auth.js';
import { getAnalytics, getInsights, getCompare } from '../controllers/analyticsController.js';

const router = express.Router();

// GET /api/analytics — returns full analytics payload for authenticated user
router.get('/', protect, getAnalytics);

// GET /api/analytics/insights — rule-based insights for authenticated user
router.get('/insights', protect, getInsights);

// GET /api/analytics/compare — compare two segments (months, platforms, content types, categories)
router.get('/compare', protect, getCompare);

export default router;
