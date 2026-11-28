import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getJwtSecret, JWT_ALGORITHM } from '../config/jwt.js';

/**
 * Protect routes - verify JWT token and attach authenticated user to req.user
 */
export const protect = async (req, res, next) => {
  let token;

  const header = req.headers.authorization;
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    token = header.slice('Bearer '.length).trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized to access this route, token missing' });
  }

  try {
    // Pin the algorithm so a token signed with anything else (e.g. "none") is rejected
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });

    // Fetch user without password
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User associated with this token no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    const expired = error.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Session expired, please sign in again' : 'Not authorized, token invalid or expired',
    });
  }
};
