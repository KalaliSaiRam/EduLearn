const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { geocodeAddress } = require('../utils/geocode');

// Setup multer for certificate uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, 'cert_' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed for certification.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

// @route   POST /api/auth/student/register
// @desc    Register a new student
router.post('/student/register', async (req, res) => {
  try {
    const { name, email, phone, gender, studentClass, address, city, pincode, password } = req.body;

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ msg: 'Password must be at least 8 characters long and include uppercase, lowercase, and special characters.' });
    }

    // Check if email exists
    const [existingUsers] = await pool.query('SELECT * FROM student_login WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ msg: 'Email already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Geocode the address to get lat/lng
    let latitude = null, longitude = null;
    try {
      const geo = await geocodeAddress(address, city, pincode);
      if (geo) {
        latitude = geo.latitude;
        longitude = geo.longitude;
        console.log(`📍 Student geocoded: ${address}, ${city} → ${latitude}, ${longitude}`);
      }
    } catch (geoErr) {
      console.error('Geocoding failed (non-blocking):', geoErr.message);
    }

    // Insert user with location
    const sql = `INSERT INTO student_login (name, email, phone, gender, class, address, city, pincode, password, latitude, longitude) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await pool.query(sql, [name, email, phone, gender, studentClass, address, city, pincode, hashedPassword, latitude, longitude]);

    res.status(201).json({ msg: 'Registration successful! You can now login.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during registration.' });
  }
});

// @route   POST /api/auth/student/login
// @desc    Login student
router.post('/student/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query('SELECT * FROM student_login WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(400).json({ msg: 'No account found with this email.' });
    }

    const user = users[0];

    // Check password (the original PHP used password_hash with default algorithm, bcrypt is compatible)
    // Note: If old passwords from PHP cannot be read, you might have bcrypt format differences but generally Node and PHP bcrypt are compatible depending on format (e.g. $2y$ vs $2a$).
    // If $2y$ is used, modern Node bcryptjs handles it.
    let isMatch = false;
    try {
        const hashedPswd = user.password.replace('$2y$', '$2a$'); // Sometimes needed for Node bcrypt js
        isMatch = await bcrypt.compare(password, hashedPswd);
    } catch {
        isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(400).json({ msg: 'Incorrect password.' });
    }

    // Generate JWT
    const payload = {
      user: {
        id: user.student_id || user.id, // Depends on actual schema
        email: user.email,
        name: user.name,
        role: 'student'
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'supersecretjwtkey_edulearning',
      { expiresIn: '10h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload.user });
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during login.' });
  }
});

// @route   POST /api/auth/teacher/register
// @desc    Register a new teacher
router.post('/teacher/register', upload.single('certificate'), async (req, res) => {
  try {
    const { name, email, phone, gender, type, subject, address, pincode, password } = req.body;

    // Check if email exists
    const [existingUsers] = await pool.query('SELECT * FROM teacher_login WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      if (req.file) fs.unlinkSync(req.file.path); // remove uploaded file if fail
      return res.status(400).json({ msg: 'Email already registered.' });
    }

    let certificate_path = null;
    if (type === 'Professional') {
      if (!req.file) {
        return res.status(400).json({ msg: 'Professional teachers must upload a valid PDF certification.' });
      }
      certificate_path = req.file.path;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Geocode the address to get lat/lng
    let latitude = null, longitude = null;
    try {
      const geo = await geocodeAddress(address, null, pincode);
      if (geo) {
        latitude = geo.latitude;
        longitude = geo.longitude;
        console.log(`📍 Teacher geocoded: ${address}, ${pincode} → ${latitude}, ${longitude}`);
      }
    } catch (geoErr) {
      console.error('Geocoding failed (non-blocking):', geoErr.message);
    }

    // Insert user with location
    const sql = `INSERT INTO teacher_login (name, email, phone, gender, type, subject, address, pincode, password, certificate_path, latitude, longitude) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await pool.query(sql, [name, email, phone, gender, type, subject, address, pincode, hashedPassword, certificate_path, latitude, longitude]);

    res.status(201).json({ msg: 'Registration successful! You can now login.' });
  } catch (err) {
    console.error(err);
    if (req.file) fs.unlinkSync(req.file.path); // remove uploaded file if fail
    res.status(500).json({ msg: err.message || 'Server error during registration.' });
  }
});

// @route   POST /api/auth/teacher/login
// @desc    Login teacher
router.post('/teacher/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.query('SELECT * FROM teacher_login WHERE email = ?', [email]);

    if (users.length === 0) {
      return res.status(400).json({ msg: 'No account found with this email.' });
    }

    const user = users[0];

    let isMatch = false;
    try {
        const hashedPswd = user.password.replace('$2y$', '$2a$'); 
        isMatch = await bcrypt.compare(password, hashedPswd);
    } catch {
        isMatch = await bcrypt.compare(password, user.password);
    }

    if (!isMatch) {
      return res.status(400).json({ msg: 'Incorrect password.' });
    }

    // Generate JWT
    const payload = {
      user: {
        id: user.teacher_id || user.id, // Depends on actual schema
        email: user.email,
        name: user.name,
        type: user.type,
        role: 'teacher'
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'supersecretjwtkey_edulearning',
      { expiresIn: '10h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token, user: payload.user });
      }
    );

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during login.' });
  }
});

module.exports = router;
