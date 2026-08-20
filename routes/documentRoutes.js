/**
 * @file routes/documentRoutes.js
 * @description Express router with tiered rate limiting per endpoint.
 *
 * ROUTE DESIGN:
 * - Upload routes use uploadLimiter (strict: 10/15min) because hashing is CPU-intensive
 * - Read routes use apiLimiter (relaxed: 100/15min) because they're lightweight
 * - Each route is a clear REST endpoint following API design best practices
 */

import { Router } from 'express';
import { streamUpload } from '../middlewares/streamHasher.js';
import { uploadLimiter, apiLimiter } from '../middlewares/rateLimiter.js';
import {
  uploadDocument,
  verifyByFile,
  verifyByHash,
  getDocuments,
  getDocument,
  getHealth,
} from '../controllers/documentController.js';

const router = Router();

// ═══════════════════════════════════════════
//  UPLOAD & ANCHOR
// ═══════════════════════════════════════════

/** Upload a file → stream-hash → blockchain anchor */
router.post(
  '/documents/upload',
  uploadLimiter,
  streamUpload.single('file'),
  uploadDocument
);

// ═══════════════════════════════════════════
//  VERIFICATION
// ═══════════════════════════════════════════

/** Verify by re-uploading the original file */
router.post(
  '/documents/verify/file',
  uploadLimiter,
  streamUpload.single('file'),
  verifyByFile
);

/** Verify by providing the SHA-256 hash directly */
router.post(
  '/documents/verify/hash',
  apiLimiter,
  verifyByHash
);

// ═══════════════════════════════════════════
//  READ OPERATIONS
// ═══════════════════════════════════════════

/** List all anchored documents (paginated) */
router.get('/documents', apiLimiter, getDocuments);

/** Get a single document by ID */
router.get('/documents/:id', apiLimiter, getDocument);

// ═══════════════════════════════════════════
//  SYSTEM
// ═══════════════════════════════════════════

/** Health check — returns uptime, memory usage, DB status */
router.get('/health', getHealth);

export default router;
