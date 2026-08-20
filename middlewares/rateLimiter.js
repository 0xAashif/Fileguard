/**
 * @file middlewares/rateLimiter.js
 * @description Tiered rate limiting to prevent API abuse and DoS attacks.
 *
 * WHY TIERED LIMITS:
 * - File uploads are expensive (CPU for hashing, bandwidth) → strict limit (10/15min)
 * - Read-only API calls are cheap → relaxed limit (100/15min)
 * - This prevents a single IP from overwhelming the hashing pipeline
 *   while still allowing normal verification usage.
 */

import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for file upload endpoints.
 * 10 uploads per 15 minutes per IP address.
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,  // Return rate limit info in headers (RateLimit-*)
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many file uploads from this IP. Please try again in 15 minutes.',
    retryAfter: '15 minutes',
  },
});

/**
 * General API limiter for read operations.
 * 100 requests per 15 minutes per IP address.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'API rate limit exceeded',
    message: 'Too many requests from this IP. Please try again later.',
    retryAfter: '15 minutes',
  },
});
