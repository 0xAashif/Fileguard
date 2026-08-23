import express from 'express';
import User from '../models/User.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Protected by a simple admin secret or hardcoded check for now
const requireAdmin = (req, res, next) => {
  const adminSecret = process.env.ADMIN_SECRET;
  
  // If ADMIN_SECRET is set, use it for authorization (via header or query)
  if (adminSecret) {
    const providedSecret = req.headers['x-admin-secret'] || req.query.secret;
    if (providedSecret !== adminSecret) {
      return res.status(403).json({ error: 'Forbidden: Invalid admin secret' });
    }
    return next();
  }

  // Fallback: If no ADMIN_SECRET is configured, we can restrict by Aloof's ID 
  // or just fail. Let's enforce that ADMIN_SECRET must be set to use this route.
  return res.status(501).json({ error: 'ADMIN_SECRET is not configured' });
};

router.post('/verify-issuer/:id', requireAdmin, async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Issuer not found' });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    await user.save();

    res.json({
      message: 'Issuer verified successfully',
      issuer: {
        id: user._id,
        email: user.email,
        issuerName: user.issuerName,
        isVerified: user.isVerified,
        verifiedAt: user.verifiedAt,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
