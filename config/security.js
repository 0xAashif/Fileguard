/**
 * @file config/security.js
 * @description Centralized security configurations following OWASP best practices.
 *
 * WHY HELMET:
 * Helmet sets HTTP response headers that protect against common web vulnerabilities:
 * - X-Content-Type-Options: nosniff → prevents MIME-type sniffing attacks
 * - Strict-Transport-Security → forces HTTPS in production
 * - X-Frame-Options: DENY → prevents clickjacking via iframes
 * - Content-Security-Policy → restricts resource loading origins
 *
 * WHY STRICT CORS:
 * Only the frontend origin (CORS_ORIGIN) can make API requests.
 * This prevents malicious sites from making authenticated requests
 * to our API on behalf of users (CSRF protection layer).
 */

/**
 * Helmet.js configuration for HTTP header hardening.
 * @see https://helmetjs.github.io/
 */
export const helmetConfig = {
  // Content Security Policy — restrict where resources can be loaded from
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
    },
  },
  // Force HTTPS connections (browsers remember this for 1 year)
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
  },
  // Prevent the page from being embedded in an iframe (anti-clickjacking)
  frameguard: { action: 'deny' },
  // Prevent browsers from guessing content types (MIME sniffing attack)
  noSniff: true,
  // Enable XSS filter in legacy browsers
  xssFilter: true,
  // Don't send Referer header to other origins
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
};

/**
 * CORS configuration — controls which origins can access the API.
 */
export const corsConfig = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Expose custom headers so the frontend can read them
  exposedHeaders: ['X-Request-ID', 'X-Processing-Time-Ms'],
  credentials: true,
  maxAge: 86400, // Cache preflight response for 24 hours
};
