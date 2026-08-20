import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'fileguard_secret_jwt_key_2026',
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

    const user = await User.create({
      email: email.toLowerCase(),
      password,
      issuerName,
    });

    res.status(201).json({
      id: user._id,
      email: user.email,
      issuerName: user.issuerName,
      token: generateToken(user._id),
    });
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
