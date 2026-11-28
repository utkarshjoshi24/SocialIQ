import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { getJwtSecret } from './config/jwt.js';
import healthRoutes from './routes/healthRoutes.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;
// Comma-separated list of browser origins allowed to call the API
const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Fail fast on a missing/weak JWT secret in production (see config/jwt.js)
getJwtSecret();

// Connect to MongoDB
connectDB();

// Don't advertise the framework in response headers
app.disable('x-powered-by');

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests with no Origin header (curl, server-to-server) are not subject to CORS
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      // Unknown origins get no CORS headers, so browsers block the response
      return callback(null, false);
    },
    // Auth uses a bearer token, not cookies, so credentialed CORS is not needed
    credentials: false,
  })
);
app.use(express.json({ limit: '100kb' }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/prediction', predictionRoutes);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  // Malformed JSON bodies are client errors, not server errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large (max 50 MB)' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: 'Invalid upload: send a single CSV file in the "file" field' });
  }
  console.error('Unhandled server error:', err);
  // Details stay in the server log
  res.status(500).json({ error: 'Internal server error' });
});

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[SocialIQ Backend] Running on http://localhost:${PORT}`);
    console.log(`[SocialIQ Backend] Health check available at http://localhost:${PORT}/api/health`);
  });
}

export default app;
