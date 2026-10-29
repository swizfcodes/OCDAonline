// Small in-memory rate limiter for sign-in and reset endpoints (no extra dependency).
const buckets = new Map();

function rateLimit({ windowMs = 15 * 60 * 1000, max = 10, message } = {}) {
  return (req, res, next) => {
    const key = `${req.baseUrl}${req.path}|${req.ip}`;
    const now = Date.now();
    let entry = buckets.get(key);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({
        message: message || "Too many attempts. Wait a few minutes and try again.",
      });
    }
    next();
  };
}

// Housekeeping so the map doesn't grow forever
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}, 10 * 60 * 1000).unref();

module.exports = { rateLimit };
