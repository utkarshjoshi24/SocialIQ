import { Router } from 'express';
import { getPrediction } from '../controllers/predictionController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// POST /api/prediction
router.post('/', protect, getPrediction);

export default router;
