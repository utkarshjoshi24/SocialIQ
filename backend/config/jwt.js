import crypto from 'crypto';

export const JWT_ALGORITHM = 'HS256';
const MIN_SECRET_LENGTH = 32;

let devSecret = null;

/**
 * JWT signing secret from the environment. There is deliberately no hardcoded
 * fallback: in production a missing or short secret stops the server; in
 * development a random per-process secret is used (tokens then stop working
 * when the server restarts, which is acceptable locally).
 */
// Placeholder that was published in earlier .env.example files (still in git history)
const KNOWN_PUBLIC_SECRETS = new Set(['super_secret_jwt_key_change_in_production']);

export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (secret && KNOWN_PUBLIC_SECRETS.has(secret)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET is set to a publicly known placeholder; generate a new random secret');
    }
    console.warn('[SocialIQ Auth] JWT_SECRET is a publicly known placeholder; do not use it outside local development.');
    return secret;
  }
  if (secret && secret.length >= MIN_SECRET_LENGTH) return secret;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production`);
  }
  if (!devSecret) {
    devSecret = crypto.randomBytes(48).toString('hex');
    console.warn(
      `[SocialIQ Auth] JWT_SECRET is missing or shorter than ${MIN_SECRET_LENGTH} characters; ` +
        'using a random development secret (sessions reset on restart).'
    );
  }
  return devSecret;
};
