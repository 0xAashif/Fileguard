/**
 * @file middlewares/errorHandler.js
 * @description Centralized error handling middleware.
 *
 * WHY CENTRALIZED:
 * Instead of try-catching in every route handler, we throw errors
 * and let this single middleware format all error responses consistently.
 * In production, stack traces are NEVER leaked to the client (OWASP A09:2021).
 */

/**
 * Custom application error class.
 * Allows controllers to throw errors with specific HTTP status codes.
 *
 * @example throw new AppError('File not found', 404);
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes expected errors from bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Express error-handling middleware (4 arguments = error handler).
 * Catches all errors thrown or passed via next(err) in the app.
 */
export function errorHandler(err, req, res, _next) {
  // Default to 500 if no status code set
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // ── Handle Multer-specific errors ──
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: 'File size exceeds the 100MB limit.',
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files',
      message: 'Only one file per upload is allowed.',
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected field',
      message: 'File must be uploaded under the "file" field name.',
    });
  }

  // ── Handle Mongoose validation errors ──
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: messages.join('. '),
    });
  }

  // ── Handle Mongoose cast errors (invalid ObjectId, etc.) ──
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID',
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // ── Log server errors ──
  if (statusCode >= 500) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);
  }

  // ── Send response ──
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    // SECURITY: Never leak stack traces in production (OWASP A09)
    ...(isProduction ? {} : { stack: err.stack }),
  });
}
