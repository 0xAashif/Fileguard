/**
 * @file models/Document.js
 * @description Mongoose schema for anchored document metadata.
 *
 * WHY THIS SCHEMA DESIGN:
 * - originalHash is indexed for O(1) lookups during verification.
 *   Without an index, every verify request would scan the entire collection.
 * - Regex validation on originalHash ensures only valid 64-char hex strings
 *   are stored, preventing garbage data from corrupting the integrity chain.
 * - verificationCount and lastVerifiedAt create an audit trail showing
 *   how many times a document's integrity has been checked.
 * - toJSON transform removes MongoDB internals (_id → id, removes __v)
 *   so API responses are clean and frontend-friendly.
 */

import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    /** Original filename (sanitized against path traversal) */
    fileName: {
      type: String,
      required: [true, 'fileName is required'],
      trim: true,
      maxlength: [255, 'fileName cannot exceed 255 characters'],
    },

    /** SHA-256 hex digest of the file content — the cryptographic fingerprint */
    originalHash: {
      type: String,
      required: [true, 'originalHash is required'],
      lowercase: true,
      trim: true,
      index: true, // B-tree index for O(1) hash lookups
      match: [/^[a-f0-9]{64}$/, 'Must be a valid 64-character SHA-256 hex string'],
    },

    /** File size in bytes — used for display and DoS detection */
    fileSizeBytes: {
      type: Number,
      default: 0,
      min: [0, 'File size cannot be negative'],
    },

    /** MIME type detected from the upload stream */
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },

    /** Hashing algorithm used (always sha256 for now, future-proofed) */
    hashAlgorithm: {
      type: String,
      default: 'sha256',
      enum: ['sha256'],
    },

    /** Document integrity status */
    status: {
      type: String,
      enum: ['anchored', 'verified', 'tampered', 'pending'],
      default: 'anchored',
    },

    /** OriginStamp blockchain transaction ID */
    originStampTxId: {
      type: String,
      trim: true,
    },

    /** Timestamp from OriginStamp blockchain anchoring */
    originStampTimestamp: {
      type: Date,
    },

    /** How many times this document has been verified */
    verificationCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /** Last time someone verified this document's integrity */
    lastVerifiedAt: {
      type: Date,
    },

    /** Time taken to hash the file (in milliseconds) */
    processingTimeMs: {
      type: Number,
      default: 0,
    },
  },
  {
    // Automatically add createdAt and updatedAt fields
    timestamps: true,

    // Clean up JSON output for API responses
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id?.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound index for common query patterns
documentSchema.index({ originalHash: 1, status: 1 });
documentSchema.index({ createdAt: -1 }); // Recent documents first

const Document = mongoose.model('Document', documentSchema);

export default Document;
