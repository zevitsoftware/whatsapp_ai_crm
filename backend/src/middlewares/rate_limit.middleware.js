const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient } = require('../config/redis');

/**
 * Standard API Rate Limiter
 * 30 requests per minute per IP
 * Skips auth routes as they have their own dedicated limiter
 * Disabled in development mode for easier testing
 */
exports.apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 requests per minute
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip auth routes (they have their own limiter)
    if (req.path.startsWith('/api/auth')) return true;
    // Skip webhooks (they have their own limiter)
    if (req.path.startsWith('/webhooks')) return true;
    // Skip in development mode
    if (process.env.NODE_ENV === 'development') return true;
    return false;
  },
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().call(...args),
    prefix: 'api:rl:',
  }),
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

/**
 * Stricter Limiter for Auth Routes (Login, Register)
 * 50 attempts per 15 minutes per IP
 * Disabled in development mode for easier testing
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50, 
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development', // Skip in development
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().call(...args),
    prefix: 'auth:rl:',
  }),
  message: {
    error: 'Too many attempts',
    message: 'Too many authentication attempts, please try again after 15 minutes'
  }
});

/**
 * Webhook specific limiter (High volume acceptable but prevent DDoS)
 * 1000 requests per minute
 */
exports.webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 1000, 
  store: new RedisStore({
    sendCommand: (...args) => getRedisClient().call(...args),
    prefix: 'hook:rl:',
  }),
  skip: (req) => process.env.NODE_ENV === 'test'
});
