const express = require('express');
const router = express.Router();
const pool = require('../db');

// Haversine distance calculation in km
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── GET /api/profile/student ───
router.get('/student', async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ msg: 'Not authorized as a student' });
        }

        const sql = `
            SELECT 
                sl.name, sl.email, sl.phone, sl."class", sl.gender,
                sl.address, sl.city, sl.pincode, sl.bio, sl.avatar_url,
                sl.latitude, sl.longitude,
                tl.name AS teacher_name,
                tl.email AS teacher_email,
                tl.subject AS teacher_subject
            FROM student_login sl
            LEFT JOIN booking_request br ON sl.email = br.email AND br.status = 'accepted'
            LEFT JOIN teacher_login tl ON br.teacher_email = tl.email
            WHERE sl.email = ?
            LIMIT 1
        `;
        
        const [rows] = await pool.query(sql, [req.user.email]);
        
        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Profile not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ─── PUT /api/profile/student ── Update student profile ───
router.put('/student', async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const { phone, address, city, pincode, bio, latitude, longitude } = req.body;
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (phone) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
        if (address) { updates.push(`address = $${paramIndex++}`); values.push(address); }
        if (city) { updates.push(`city = $${paramIndex++}`); values.push(city); }
        if (pincode) { updates.push(`pincode = $${paramIndex++}`); values.push(pincode); }
        if (bio !== undefined) { updates.push(`bio = $${paramIndex++}`); values.push(bio); }
        if (latitude !== undefined) { updates.push(`latitude = $${paramIndex++}`); values.push(latitude); }
        if (longitude !== undefined) { updates.push(`longitude = $${paramIndex++}`); values.push(longitude); }

        if (updates.length === 0) {
            return res.status(400).json({ msg: 'No fields to update' });
        }

        values.push(req.user.email);
        const pool = require('../db');
        await pool.query(`UPDATE student_login SET ${updates.join(', ')} WHERE email = $${paramIndex}`, values);

        res.json({ success: true, message: 'Profile updated.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ─── GET /api/profile/tutor ───
router.get('/tutor', async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ msg: 'Not authorized as a teacher' });
        }

        const sql = `SELECT name, email, phone, gender, type, subject, address, pincode, bio, avatar_url,
                     hourly_rate, experience_years, rating, total_reviews, latitude, longitude
                     FROM teacher_login WHERE email = ? LIMIT 1`;
        const [rows] = await pool.query(sql, [req.user.email]);

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Profile not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ─── PUT /api/profile/tutor ── Update tutor profile ───
router.put('/tutor', async (req, res) => {
    try {
        if (req.user.role !== 'teacher') {
            return res.status(403).json({ msg: 'Not authorized' });
        }

        const { phone, address, pincode, bio, hourly_rate, experience_years, latitude, longitude, subject } = req.body;
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (phone) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
        if (address) { updates.push(`address = $${paramIndex++}`); values.push(address); }
        if (pincode) { updates.push(`pincode = $${paramIndex++}`); values.push(pincode); }
        if (bio !== undefined) { updates.push(`bio = $${paramIndex++}`); values.push(bio); }
        if (hourly_rate !== undefined) { updates.push(`hourly_rate = $${paramIndex++}`); values.push(hourly_rate); }
        if (experience_years !== undefined) { updates.push(`experience_years = $${paramIndex++}`); values.push(experience_years); }
        if (latitude !== undefined) { updates.push(`latitude = $${paramIndex++}`); values.push(latitude); }
        if (longitude !== undefined) { updates.push(`longitude = $${paramIndex++}`); values.push(longitude); }
        if (subject) { updates.push(`subject = $${paramIndex++}`); values.push(subject); }

        if (updates.length === 0) {
            return res.status(400).json({ msg: 'No fields to update' });
        }

        values.push(req.user.email);
        const pool = require('../db');
        await pool.query(`UPDATE teacher_login SET ${updates.join(', ')} WHERE email = $${paramIndex}`, values);

        res.json({ success: true, message: 'Profile updated.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ─── GET /api/profile/tutor/:email ── Public tutor profile (for students) ───
router.get('/tutor/:email', async (req, res) => {
    try {
        const tutorEmail = req.params.email;
        const [rows] = await pool.query(
            `SELECT name, email, gender, type, subject, address, pincode, bio, avatar_url,
                    hourly_rate, experience_years, rating, total_reviews, latitude, longitude
             FROM teacher_login WHERE email = ?`, 
            [tutorEmail]
        );

        if (rows.length === 0) {
            return res.status(404).json({ msg: 'Tutor not found' });
        }

        const tutor = rows[0];

        // If requesting user is a student, calculate distance
        if (req.user.role === 'student') {
            const [student] = await pool.query(
                `SELECT latitude, longitude FROM student_login WHERE email = ?`,
                [req.user.email]
            );
            if (student.length > 0 && student[0].latitude && student[0].longitude && tutor.latitude && tutor.longitude) {
                tutor.distance_km = Math.round(
                    haversineDistance(student[0].latitude, student[0].longitude, tutor.latitude, tutor.longitude) * 10
                ) / 10;
            }
        }

        res.json(tutor);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ─── GET /api/profile/public/:email ── Look up any user's name by email ───
router.get('/public/:email', async (req, res) => {
    try {
        const email = req.params.email;
        
        const [student] = await pool.query('SELECT name, email FROM student_login WHERE email = ?', [email]);
        if (student.length > 0) return res.json({ name: student[0].name, email: student[0].email, role: 'Student' });
        
        const [teacher] = await pool.query('SELECT name, email, type, subject FROM teacher_login WHERE email = ?', [email]);
        if (teacher.length > 0) return res.json({ name: teacher[0].name, email: teacher[0].email, role: teacher[0].type, subject: teacher[0].subject });
        
        return res.status(404).json({ error: 'User not found' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;

