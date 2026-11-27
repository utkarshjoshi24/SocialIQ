import { Router } from 'express';
import multer from 'multer';
import { uploadCSV } from '../controllers/uploadController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Configure multer with memory storage and 50MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
});

// POST /api/upload/csv
router.post('/csv', protect, upload.single('file'), uploadCSV);

export default router;
