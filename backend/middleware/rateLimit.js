/**
 * Minimal in-memory, fixed-window rate limiter (no extra dependency).
 * Used on login/register to slow down password guessing.
 *
 * Limitations: per-process memory (not shared across instances) and keyed by
 * req.ip, so behind a reverse proxy `app.set('trust proxy', ...)` must be
 * configured for the client IP to be seen.
 */
export const rateLimit = ({ windowMs, max, message }) => {
  const hits = new Map();

  // Drop expired entries so the map cannot grow without bound
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
};
