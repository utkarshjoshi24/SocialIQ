import jwt from 'jsonwebtoken';
import { getJwtSecret, JWT_ALGORITHM } from '../config/jwt.js';

/**
 * Generate a signed JWT token
 * @param {string} id User ID
 * @returns {string} Signed JWT
 */
export const generateToken = (id) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ id }, getJwtSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn,
  });
};
