import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    issuerName: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: [true, 'fileName is required'],
      trim: true,
      maxlength: [255, 'fileName cannot exceed 255 characters'],
    },
    originalHash: {
      type: String,
      required: [true, 'originalHash is required'],
      lowercase: true,
      trim: true,
      index: true,
      match: [/^[a-f0-9]{64}$/, 'Must be a valid 64-character SHA-256 hex string'],
    },
    fileSizeBytes: {
      type: Number,
      default: 0,
      min: [0, 'File size cannot be negative'],
    },
    mimeType: {
      type: String,
      default: 'application/octet-stream',
    },
    hashAlgorithm: {
      type: String,
      default: 'sha256',
      enum: ['sha256'],
    },
    status: {
      type: String,
      enum: ['anchored', 'verified', 'tampered', 'pending', 'mock'],
      default: 'anchored',
    },
    originStampTxId: {
      type: String,
      trim: true,
    },
    originStampTimestamp: {
      type: Date,
    },
    verificationCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastVerifiedAt: {
      type: Date,
    },
    processingTimeMs: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
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

documentSchema.index({ originalHash: 1, status: 1 });
documentSchema.index({ userId: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);

export default Document;
