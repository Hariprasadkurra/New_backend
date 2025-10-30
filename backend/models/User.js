// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true },
  refreshToken: { type: String, default: null },
  otpCode: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Logins', userSchema);
