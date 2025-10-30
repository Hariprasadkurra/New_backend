// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const createAuthRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { createAuthRateLimiter };
