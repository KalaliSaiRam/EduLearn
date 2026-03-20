const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// ─── Security Middleware ───
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiter — 200 requests per minute per IP
const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Static file serving
app.use('/uploads', express.static('uploads'));

const auth = require('./middleware/auth');

// ─── Public Routes ───
app.use('/api/auth', require('./routes/auth'));

// ─── Protected Routes ───
app.use('/api/profile', auth, require('./routes/profile'));
app.use('/api/student', auth, require('./routes/student'));
app.use('/api/tutor', auth, require('./routes/tutor'));
app.use('/api/student-tests', auth, require('./routes/student-tests'));
app.use('/api/dashboard', auth, require('./routes/dashboard'));
app.use('/api/reviews', auth, require('./routes/reviews'));
app.use('/api/assignments', auth, require('./routes/assignments'));
app.use('/api/schedule', auth, require('./routes/schedule'));
app.use('/api/messages', auth, require('./routes/messages'));
app.use('/api/geocode', auth, require('./routes/geocode'));

// ─── Global Error Handler ───
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.stack);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

// ─── Health Check ───
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 EduLearning API running on port ${PORT}`));
