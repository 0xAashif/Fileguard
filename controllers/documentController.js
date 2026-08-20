/**
 * @file controllers/documentController.js
 * @description Business logic for document upload, verification, and listing.
 *
 * WHY MVC SEPARATION:
 * Controllers contain ONLY business logic — they don't know about HTTP
 * headers, rate limiting, or database connection details.
 * This makes the logic testable, reusable, and easy to explain in interviews.
 */

import Document from '../models/Document.js';
import { compareHashes } from '../services/hashService.js';
import { submitHash } from '../services/originStamp.js';
import { AppError } from '../middlewares/errorHandler.js';

/**
 * Upload a document → compute hash → anchor to blockchain.
 * The streamHasher middleware has already computed the SHA-256 hash
 * by the time this controller runs. We just persist and anchor it.
 *
 * POST /api/documents/upload
 */
export async function uploadDocument(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded. Use the "file" field name.', 400);
    }

    // Hash result is attached by our custom StreamHashStorage engine
    const { fileName, hash, fileSizeBytes, mimeType, hashAlgorithm, processingTimeMs } = req.file;

    // ── Duplicate Detection ──
    // Check if this exact file (same hash) has already been anchored.
    // This prevents wasting OriginStamp API calls on duplicate uploads.
    const existing = await Document.findOne({ originalHash: hash });
    if (existing) {
      return res.status(200).json({
        message: 'Document already anchored with this exact hash.',
        duplicate: true,
        document: existing,
      });
    }

    // ── Blockchain Anchoring ──
    const stampResult = await submitHash(hash, fileName);

    // ── Persist to Database ──
    const document = await Document.create({
      fileName,
      originalHash: hash,
      fileSizeBytes,
      mimeType,
      hashAlgorithm,
      processingTimeMs,
      status: 'anchored',
      originStampTxId: stampResult.transactionId,
      originStampTimestamp: stampResult.timestamp,
    });

    res.status(201).json({
      message: 'Document secured and anchored successfully.',
      document,
      anchoring: {
        network: stampResult.network,
        mode: stampResult.mode,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify a document by re-uploading the file.
 * Computes hash of the uploaded file and checks against database.
 *
 * POST /api/documents/verify/file
 */
export async function verifyByFile(req, res, next) {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded for verification.', 400);
    }

    const { hash, fileName, processingTimeMs } = req.file;

    // ── Look up hash in database ──
    const document = await Document.findOne({ originalHash: hash });

    if (document) {
      // File matches an anchored document — it's authentic
      document.verificationCount += 1;
      document.lastVerifiedAt = new Date();
      document.status = 'verified';
      await document.save();

      return res.json({
        verified: true,
        status: 'authentic',
        message: `✓ Document "${fileName}" is authentic and matches the anchored record.`,
        processingTimeMs,
        document,
      });
    }

    // Hash not found — unknown document
    res.json({
      verified: false,
      status: 'unknown',
      message: `✗ No anchored record found for "${fileName}". This document has not been secured with FileGuard.`,
      computedHash: hash,
      processingTimeMs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify a document by providing its SHA-256 hash directly.
 * Uses timing-safe comparison to prevent side-channel attacks.
 *
 * POST /api/documents/verify/hash
 */
export async function verifyByHash(req, res, next) {
  try {
    const { hash } = req.body;

    if (!hash) {
      throw new AppError('Hash is required in request body.', 400);
    }

    // Validate hash format
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      throw new AppError('Invalid hash format. Must be a 64-character hexadecimal string.', 400);
    }

    // ── Database Lookup ──
    const document = await Document.findOne({ originalHash: hash.toLowerCase() });

    if (document) {
      // Use timing-safe comparison as an extra security layer
      const comparison = compareHashes(hash, document.originalHash);

      if (comparison.match) {
        document.verificationCount += 1;
        document.lastVerifiedAt = new Date();
        document.status = 'verified';
        await document.save();

        return res.json({
          verified: true,
          status: 'authentic',
          message: '✓ Hash matches an anchored document.',
          comparisonMethod: comparison.method,
          document,
        });
      }
    }

    res.json({
      verified: false,
      status: 'unknown',
      message: '✗ No anchored record found for this hash.',
      hash: hash.toLowerCase(),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List all anchored documents with pagination.
 *
 * GET /api/documents?page=1&limit=20
 */
export async function getDocuments(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      Document.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Document.countDocuments(),
    ]);

    res.json({
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get a single document by its ID.
 *
 * GET /api/documents/:id
 */
export async function getDocument(req, res, next) {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      throw new AppError('Document not found.', 404);
    }

    res.json({ document });
  } catch (error) {
    next(error);
  }
}

/**
 * Health check endpoint — returns system status.
 *
 * GET /api/health
 */
export async function getHealth(_req, res) {
  const memUsage = process.memoryUsage();

  res.json({
    status: 'operational',
    uptime: `${Math.floor(process.uptime())}s`,
    nodeVersion: process.version,
    memory: {
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    },
    timestamp: new Date().toISOString(),
  });
}
