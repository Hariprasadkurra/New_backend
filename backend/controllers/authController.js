// controllers/authController.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
require('dotenv').config();

const saltRounds = 10;

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

function generateAccessToken(payload) {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });
}
function generateRefreshToken(payload) {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' });
}

const register = async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { email, password } = value;
    const existing = await User.findOne({ email }).exec();
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hash = await bcrypt.hash(password, saltRounds);
    const user = new User({
      email,
      passwordHash: hash
    });
    await user.save();

    // simulate OTP generation (for demo/testing)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    user.otpCode = otp;
    user.otpExpiresAt = otpExpires;
    await user.save();

    return res.status(201).json({ message: 'Registered. Verify OTP to activate (simulation).', otp });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Missing email or otp' });

    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(400).json({ message: 'User not found' });

    if (!user.otpCode || !user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP expired or not set' });
    }
    if (user.otpCode !== otp) return res.status(400).json({ message: 'Invalid OTP' });

    user.otpCode = null;
    user.otpExpiresAt = null;
    await user.save();

    res.json({ message: 'OTP verified. Account active.' });
  } catch (err) {
    console.error('verifyOtp error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const login = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { email, password } = value;
    const user = await User.findOne({ email }).exec();
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const userPayload = { id: user._id.toString(), email: user.email };
    const accessToken = generateAccessToken(userPayload);
    const refreshToken = generateRefreshToken(userPayload);

    // store refresh token server-side (simple approach)
    user.refreshToken = refreshToken;
    await user.save();

    res.json({ accessToken, refreshToken, expiresIn: process.env.ACCESS_TOKEN_EXPIRY || '15m' });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ message: 'Missing refresh token' });
  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(payload.id).exec();
    if (!user || user.refreshToken !== refreshToken) return res.status(403).json({ message: 'Invalid refresh token' });

    const newAccess = generateAccessToken({ id: payload.id, email: payload.email });
    const newRefresh = generateRefreshToken({ id: payload.id, email: payload.email });

    user.refreshToken = newRefresh;
    await user.save();

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    console.error('refresh error:', err);
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};

const logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ message: 'Missing refresh token' });
  try {
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (e) {
      // invalid token -> respond success (no info)
      return res.json({ message: 'Logged out' });
    }
    const user = await User.findById(payload.id).exec();
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('logout error:', err);
    res.json({ message: 'Logged out' });
  }
};

const protectedRoute = (req, res) => {
  res.json({ message: 'You reached a protected route', user: req.user });
};

module.exports = { register, login, refresh, logout, protectedRoute, verifyOtp };
