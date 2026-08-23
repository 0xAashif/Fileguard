import jwt from 'jsonwebtoken';
import User from '../models/User.js';

import { sendVerificationEmail, generateVerificationToken } from '../services/emailService.js';

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const register = async (req, res, next) => {
  try {
    const { email, password, issuerName } = req.body;

    if (!email || !password || !issuerName) {
      return res
        .status(400)
        .json({ error: 'Please provide email, password and issuer organization name' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const verificationToken = generateVerificationToken();
    const tokenExpires = new Date();
    tokenExpires.setHours(tokenExpires.getHours() + 24); // 24 hours expiry

    const user = await User.create({
      email: email.toLowerCase(),
      password,
      issuerName,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: tokenExpires,
      isVerified: false,
    });

    // Fire & forget the email
    sendVerificationEmail(user.email, verificationToken, req);

    res.status(201).json({
      id: user._id,
      email: user.email,
      issuerName: user.issuerName,
      token: generateToken(user._id),
      message: 'Registration successful. Please check your email to verify your account.'
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // In a real production app, redirect to the frontend with a success message.
    // For now, return JSON or a simple HTML success.
    res.send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2>Email Verified Successfully!</h2>
        <p>Your institutional identity has been partially verified. An admin will review it shortly for full issuing rights.</p>
        <a href="/" style="display: inline-block; padding: 10px 20px; background: #f59e0b; color: #fff; text-decoration: none; border-radius: 5px;">Return to App</a>
      </div>
    `);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      id: user._id,
      email: user.email,
      issuerName: user.issuerName,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({
    id: req.user._id,
    email: req.user.email,
    issuerName: req.user.issuerName,
  });
};
