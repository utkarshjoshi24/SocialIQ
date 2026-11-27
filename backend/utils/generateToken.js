import jwt from 'jsonwebtoken';

/**
 * Generate a signed JWT token
 * @param {string} id User ID
 * @returns {string} Signed JWT
 */
export const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign({ id }, secret, {
    expiresIn,
  });
};
