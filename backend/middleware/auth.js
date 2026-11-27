import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect routes - verify JWT token and attach authenticated user to req.user
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized to access this route, token missing' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
    const decoded = jwt.verify(token, secret);

    // Fetch user without password
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'User associated with this token no longer exists' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Not authorized, token invalid or expired' });
  }
};
