const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /api/reviews/tutor/:email ── Get all reviews for a tutor ───
router.get('/tutor/:email', async (req, res) => {
    try {
        const teacherEmail = req.params.email;
        const [reviews] = await db.execute(`
            SELECT r.*, sl.name AS student_name
            FROM reviews r
            JOIN student_login sl ON r.student_email = sl.email
            WHERE r.teacher_email = ?
            ORDER BY r.created_at DESC
        `, [teacherEmail]);

        // Get aggregate stats
        const [stats] = await db.execute(`
            SELECT 
                ROUND(AVG(rating), 1) AS avg_rating,
                COUNT(*) AS total_reviews,
                SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS five_star,
                SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS four_star,
                SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS three_star,
                SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS two_star,
                SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS one_star
            FROM reviews WHERE teacher_email = ?
        `, [teacherEmail]);

        res.json({
            reviews,
            stats: stats[0]
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error fetching reviews' });
    }
});

// ─── POST /api/reviews ── Submit a review ───
router.post('/', async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const { teacher_email, booking_id, rating, review_text } = req.body;

        if (!teacher_email || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Teacher email and rating (1-5) are required.' });
        }

        // Check student actually has an accepted booking with this tutor
        const [booking] = await db.execute(
            `SELECT id FROM booking_request WHERE email = ? AND teacher_email = ? AND status = 'accepted'`,
            [studentEmail, teacher_email]
        );
        if (booking.length === 0) {
            return res.status(403).json({ error: 'You can only review tutors you have booked.' });
        }

        // Check for existing review from this student for this booking
        if (booking_id) {
            const [existing] = await db.execute(
                `SELECT id FROM reviews WHERE student_email = ? AND booking_id = ?`,
                [studentEmail, booking_id]
            );
            if (existing.length > 0) {
                return res.status(400).json({ error: 'You have already reviewed this booking.' });
            }
        }

        await db.execute(
            `INSERT INTO reviews (student_email, teacher_email, booking_id, rating, review_text) VALUES (?, ?, ?, ?, ?)`,
            [studentEmail, teacher_email, booking_id || null, rating, review_text || null]
        );

        // Update teacher's aggregate rating
        const [agg] = await db.execute(
            `SELECT ROUND(AVG(rating), 2) AS avg_rating, COUNT(*) AS total_reviews FROM reviews WHERE teacher_email = ?`,
            [teacher_email]
        );
        await db.execute(
            `UPDATE teacher_login SET rating = ?, total_reviews = ? WHERE email = ?`,
            [agg[0].avg_rating, agg[0].total_reviews, teacher_email]
        );

        // Notify tutor
        const studentName = req.user.name;
        await db.execute(
            `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
            [teacher_email, `${studentName} left you a ${rating}-star review.`]
        );

        res.json({ success: true, message: 'Review submitted successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error submitting review' });
    }
});

// ─── GET /api/reviews/my-reviews ── Get reviews submitted by current student ───
router.get('/my-reviews', async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const [reviews] = await db.execute(`
            SELECT r.*, tl.name AS teacher_name
            FROM reviews r
            JOIN teacher_login tl ON r.teacher_email = tl.email
            WHERE r.student_email = ?
            ORDER BY r.created_at DESC
        `, [studentEmail]);

        res.json(reviews);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
