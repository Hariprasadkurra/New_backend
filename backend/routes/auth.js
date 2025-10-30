// routes/auth.js
const express = require('express');
const router = express.Router();
const auth = require('../controllers/authController');
const { createAuthRateLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/register', createAuthRateLimiter, auth.register);
router.post('/verify-otp', createAuthRateLimiter, auth.verifyOtp);
router.post('/login', createAuthRateLimiter, auth.login);
router.post('/refresh', auth.refresh);
router.post('/logout', auth.logout);

router.get('/protected', authenticateToken, auth.protectedRoute);

module.exports = router;
