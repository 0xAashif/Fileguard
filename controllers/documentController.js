import mongoose from 'mongoose';
import { dbState } from '../config/db.js';
import Document from '../models/Document.js';
import { submitHash } from '../services/originStamp.js';

export const anchorDocument = async (req, res, next) => {
  try {
    const { hash, fileName, fileSizeBytes } = req.body;

    if (!hash || !fileName) {
      return res.status(400).json({ error: 'hash and fileName are required' });
    }

    if (!req.user.isVerified) {
      return res.status(403).json({ error: 'Issuer identity not verified. Please verify your email or await admin approval.' });
    }

    const existing = await Document.findOne({ 
      originalHash: hash.toLowerCase(),
      userId: req.user._id
    });
    if (existing) {
      return res.status(200).json({
        message: 'Document already anchored in registry',
        duplicate: true,
        document: existing,
      });
    }

    // OriginStamp anchor
    const anchorResult = await submitHash(hash, fileName);

    const doc = await Document.create({
      userId: req.user._id,
      issuerName: req.user.issuerName || 'Verified Issuer',
      fileName,
      originalHash: hash.toLowerCase(),
      fileSizeBytes: fileSizeBytes || 0,
      status: anchorResult.mode === 'mock' ? 'mock' : 'anchored',
      originStampTxId: anchorResult.transactionId,
      originStampTimestamp: anchorResult.timestamp || new Date(),
    });

    res.status(201).json({
      message: 'Document anchored successfully',
      document: doc,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyDocument = async (req, res, next) => {
  try {
    const { hash } = req.body;
    if (!hash) return res.status(400).json({ error: 'Hash is required' });

    const doc = await Document.findOne({ originalHash: hash.toLowerCase() }).populate('userId', 'isVerified');

    if (!doc) {
      return res.status(404).json({
        verified: false,
        status: 'unknown',
        message: 'No cryptographic record found for this document.',
      });
    }

    // Update audit counters
    doc.verificationCount = (doc.verificationCount || 0) + 1;
    doc.lastVerifiedAt = new Date();
    await doc.save();

    res.json({
      verified: true,
      status: doc.status,
      message: 'Cryptographic proof verified successfully.',
      document: {
        id: doc._id,
        fileName: doc.fileName,
        originalHash: doc.originalHash,
        fileSizeBytes: doc.fileSizeBytes,
        issuerName: doc.issuerName,
        issuerVerified: doc.userId?.isVerified || false,
        status: doc.status,
        originStampTxId: doc.originStampTxId,
        originStampTimestamp: doc.originStampTimestamp,
        createdAt: doc.createdAt,
        verificationCount: doc.verificationCount,
        lastVerifiedAt: doc.lastVerifiedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Document.countDocuments({ userId: req.user._id });
    const docs = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      documents: docs,
      pagination: { 
        total, 
        page, 
        pages: Math.ceil(total / limit) 
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getDocument = async (req, res, next) => {
  try {
    const doc = await Document.findById(req.params.id).populate('userId', 'isVerified');
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    
    // Return safe shape
    res.json({ 
      document: {
        id: doc._id,
        fileName: doc.fileName,
        originalHash: doc.originalHash,
        fileSizeBytes: doc.fileSizeBytes,
        issuerName: doc.issuerName,
        issuerVerified: doc.userId?.isVerified || false,
        status: doc.status,
        originStampTxId: doc.originStampTxId,
        originStampTimestamp: doc.originStampTimestamp,
        createdAt: doc.createdAt,
        verificationCount: doc.verificationCount,
        lastVerifiedAt: doc.lastVerifiedAt,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getHealth = (req, res) => {
  res.json({
    status: dbState.isConnected ? 'operational' : 'degraded',
    database: {
      connected: dbState.isConnected,
      readyState: mongoose.connection.readyState
    },
    originStampMode: process.env.ORIGINSTAMP_API_KEY ? 'live' : 'mock',
    timestamp: new Date()
  });
};
