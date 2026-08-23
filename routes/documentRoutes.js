import express from 'express';
import { uploadLimiter, apiLimiter, userAnchorLimiter } from '../middlewares/rateLimiter.js';
import { protect } from '../middlewares/authMiddleware.js';
import {
  anchorDocument,
  verifyDocument,
  getDocuments,
  getDocument,
  getHealth,
} from '../controllers/documentController.js';

const router = express.Router();

// Public health check
router.get('/health', getHealth);

// Public verification (anyone can verify a document's authenticity)
router.post('/documents/verify', apiLimiter, verifyDocument);
router.get('/documents/:id', apiLimiter, getDocument);

// Protected routes (Issuers only)
router.post('/documents/anchor', uploadLimiter, protect, userAnchorLimiter, anchorDocument);
router.get('/documents', apiLimiter, protect, getDocuments);

export default router;
