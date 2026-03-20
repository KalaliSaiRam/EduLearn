const express = require('express');
const router = express.Router();
const db = require('../db');

// Get Student Progress
router.get('/progress', async (req, res) => {
    try {
        const studentEmail = req.user.email; // Assuming user email is attached to req.user by auth middleware
        const studentName = req.user.name;

        // 1. Get accepted teacher's email from booking_request
        const [bookingResult] = await db.execute(
            `SELECT teacher_email FROM booking_request WHERE email = ? AND status = 'accepted' LIMIT 1`,
            [studentEmail]
        );

        if (bookingResult.length === 0) {
            return res.json({ 
                error: "No accepted teacher found for the student.",
                totalTests: 0,
                totalSubmitted: 0,
                averageMarks: 0,
                marksData: [],
                labels: []
            });
        }

        const teacherEmail = bookingResult[0].teacher_email;

        // 2. Total tests created by this teacher
        const [totalTestsResult] = await db.execute(
            `SELECT COUNT(*) AS total_tests FROM tests WHERE teacher_email = ?`,
            [teacherEmail]
        );
        const totalTests = totalTestsResult[0].total_tests;

        // 3. Total test submissions by student
        const [totalSubmittedResult] = await db.execute(
            `SELECT COUNT(*) AS total_submitted FROM test_submissions WHERE student_email = ?`,
            [studentEmail]
        );
        const totalSubmitted = totalSubmittedResult[0].total_submitted;

        // 4. Average marks
        const [avgMarksResult] = await db.execute(
            `SELECT AVG(marks) AS average_marks FROM test_submissions WHERE student_email = ? AND marks IS NOT NULL`,
            [studentEmail]
        );
        // Ensure rounding to 2 decimal places
        const avgRaw = avgMarksResult[0].average_marks;
        const averageMarks = avgRaw ? parseFloat(avgRaw).toFixed(2) : null;

        // 5. Get marks history for chart
        const [marksHistoryResult] = await db.execute(
            `SELECT marks, submitted_at FROM test_submissions WHERE student_email = ? AND marks IS NOT NULL ORDER BY submitted_at`,
            [studentEmail]
        );

        const marksData = [];
        const labels = [];
        marksHistoryResult.forEach(row => {
            marksData.push(row.marks);
            // Format date string
            const date = new Date(row.submitted_at);
            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate().toString().padStart(2, '0');
            labels.push(`${month} ${day}`);
        });

        res.json({
            totalTests,
            totalSubmitted,
            averageMarks,
            marksData,
            labels
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get student notifications
router.get('/notifications', async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const [notifications] = await db.execute(
            `SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC`,
            [studentEmail]
        );
        res.json(notifications);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Mark student notification as read
router.post('/notifications/mark-read', async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const { notif_id, mark_all } = req.body;

        if (mark_all) {
            await db.execute(
                `UPDATE notifications SET status = 'read' WHERE user_email = ?`,
                [studentEmail]
            );
        } else if (notif_id) {
            await db.execute(
                `UPDATE notifications SET status = 'read' WHERE id = ? AND user_email = ?`,
                [notif_id, studentEmail]
            );
        }

        res.json({ msg: 'Notifications updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Fetch tutors by type (Peer or Professional) with distance calculation
router.get('/tutors', async (req, res) => {
    try {
        const type = req.query.type; // 'Peer' or 'Professional'
        const studentEmail = req.user.email;

        // Get student location
        const [studentData] = await db.execute(
            'SELECT latitude, longitude FROM student_login WHERE email = ?',
            [studentEmail]
        );
        const studentLat = studentData.length > 0 ? studentData[0].latitude : null;
        const studentLng = studentData.length > 0 ? studentData[0].longitude : null;

        let query = `SELECT id, name, email, phone, gender, address, subject, type, 
                     bio, hourly_rate, experience_years, rating, total_reviews,
                     latitude, longitude FROM teacher_login`;
        let params = [];
        
        if (type) {
             query += ` WHERE type = ?`;
             params.push(type);
        }

        query += ` ORDER BY rating DESC, total_reviews DESC`;

        const [tutors] = await db.execute(query, params);

        // Calculate distance for each tutor if student has location
        const enrichedTutors = tutors.map(tutor => {
            let distance_km = null;
            if (studentLat && studentLng && tutor.latitude && tutor.longitude) {
                const R = 6371;
                const dLat = (tutor.latitude - studentLat) * Math.PI / 180;
                const dLon = (tutor.longitude - studentLng) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 +
                          Math.cos(studentLat * Math.PI / 180) * Math.cos(tutor.latitude * Math.PI / 180) *
                          Math.sin(dLon / 2) ** 2;
                distance_km = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
            }
            return { ...tutor, distance_km };
        });

        res.json(enrichedTutors);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error fetching tutors');
    }
});

// Submit a demo request
router.post('/book-demo', async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const studentName = req.user.name;
        const { 
            studentPhone, 
            studentSubject, 
            studentBudget, 
            studentTimings, 
            requiredTutorType, 
            tutorEmail 
        } = req.body;

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Insert booking request
            await connection.execute(`
                INSERT INTO booking_request 
                (username, email, contact_number, subject, budget, timings, required_tutor_type, teacher_email) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [studentName, studentEmail, studentPhone, studentSubject, studentBudget, studentTimings, requiredTutorType, tutorEmail]);

            // Notify tutor
            const notifMsg = `${studentName} has requested a demo class in ${studentSubject}.`;
            await connection.execute(`
                INSERT INTO notifications (user_email, message, status, created_at)
                VALUES (?, ?, 'unread', NOW())
            `, [tutorEmail, notifMsg]);

            await connection.commit();
            res.json({ success: true, message: 'Demo request submitted successfully!' });

        } catch (dbErr) {
            await connection.rollback();
            throw dbErr;
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error submitting demo request' });
    }
});

// Get all bookings for the student
router.get('/bookings', async (req, res) => {
    try {
        const studentEmail = req.user.email;

        const [bookings] = await db.execute(`
            SELECT br.*, 
                   tl.name AS teacher_name_full, tl.subject AS teacher_subject, 
                   tl.phone AS teacher_phone, tl.rating AS teacher_rating,
                   tl.total_reviews AS teacher_total_reviews,
                   tl.latitude AS teacher_lat, tl.longitude AS teacher_lng,
                   tl.hourly_rate AS teacher_hourly_rate
            FROM booking_request br
            LEFT JOIN teacher_login tl ON br.teacher_email = tl.email
            WHERE br.email = ?
            ORDER BY br.id DESC
        `, [studentEmail]);

        res.json(bookings);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error fetching bookings' });
    }
});

// Get student notifications
router.get('/notifications', async (req, res) => {
    try {
        const [notifs] = await db.execute(
            `SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 50`,
            [req.user.email]
        );
        res.json(notifs);
    } catch (err) {
        console.error(err.message);
        res.status(500).json([]);
    }
});

// Mark all notifications as read
router.post('/notifications/mark-read', async (req, res) => {
    try {
        await db.execute(
            `UPDATE notifications SET status = 'read' WHERE user_email = ? AND status = 'unread'`,
            [req.user.email]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;


