/**
 * Minimal in-memory, fixed-window limiter for FAILED attempts (no extra dependency).
 * Used on login/register to slow down password guessing without locking out
 * legitimate users who share an IP (e.g. a campus network): only requests that
 * end in an error status count towards the limit.
 *
 * Limitations: per-process memory (not shared across instances) and keyed by
 * req.ip, so behind a reverse proxy `app.set('trust proxy', ...)` must be
 * configured for the client IP to be seen.
 */
export const rateLimit = ({ windowMs, max, message, keyGenerator = (req) => req.ip || 'unknown' }) => {
  const failures = new Map();

  // Drop expired entries so the map cannot grow without bound
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of failures) {
      if (entry.resetAt <= now) failures.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = failures.get(key);

    if (entry && entry.resetAt > now && entry.count >= max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }

    res.on('finish', () => {
      if (res.statusCode < 400) return;
      const current = failures.get(key);
      if (!current || current.resetAt <= Date.now()) {
        failures.set(key, { count: 1, resetAt: Date.now() + windowMs });
      } else {
        current.count += 1;
      }
    });
    next();
  };
};
