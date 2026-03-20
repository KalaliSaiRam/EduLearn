const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /api/dashboard/student ── Real-time student dashboard stats ───
router.get('/student', async (req, res) => {
    try {
        const email = req.user.email;

        // Active bookings count
        const [bookings] = await db.execute(
            `SELECT COUNT(*) AS count FROM booking_request WHERE email = ? AND status = 'accepted'`,
            [email]
        );

        // Upcoming sessions
        const [upcomingSessions] = await db.execute(
            `SELECT COUNT(*) AS count FROM sessions 
             WHERE student_email = ? AND session_date >= CURDATE() AND status = 'scheduled'`,
            [email]
        );

        // Tests pending (not yet submitted)
        const [pendingTests] = await db.execute(`
            SELECT COUNT(*) AS count FROM tests t
            WHERE t.teacher_email IN (
                SELECT teacher_email FROM booking_request WHERE email = ? AND status = 'accepted'
            ) AND t.id NOT IN (
                SELECT test_id FROM test_submissions WHERE student_email = ?
            )
        `, [email, email]);

        // Average marks
        const [avgMarks] = await db.execute(
            `SELECT ROUND(AVG(marks), 1) AS avg_marks FROM test_submissions WHERE student_email = ? AND marks IS NOT NULL`,
            [email]
        );

        // Assignments pending
        const [pendingAssignments] = await db.execute(`
            SELECT COUNT(*) AS count FROM assignments a
            WHERE a.teacher_email IN (
                SELECT teacher_email FROM booking_request WHERE email = ? AND status = 'accepted'
            ) AND a.id NOT IN (
                SELECT assignment_id FROM assignment_submissions WHERE student_email = ?
            )
        `, [email, email]);

        // Unread messages
        const [unreadMsgs] = await db.execute(
            `SELECT COUNT(*) AS count FROM messages WHERE receiver_email = ? AND is_read = FALSE`,
            [email]
        );

        // Unread notifications
        const [unreadNotifs] = await db.execute(
            `SELECT COUNT(*) AS count FROM notifications WHERE user_email = ? AND status = 'unread'`,
            [email]
        );

        // Recent activity (last 5 notifications)
        const [recentActivity] = await db.execute(
            `SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 5`,
            [email]
        );

        // Next session details
        const [nextSession] = await db.execute(`
            SELECT s.*, tl.name AS teacher_name 
            FROM sessions s
            JOIN teacher_login tl ON s.teacher_email = tl.email
            WHERE s.student_email = ? AND s.session_date >= CURDATE() AND s.status = 'scheduled'
            ORDER BY s.session_date ASC, s.start_time ASC LIMIT 1
        `, [email]);

        res.json({
            activeTutors: bookings[0].count,
            upcomingSessions: upcomingSessions[0].count,
            pendingTests: pendingTests[0].count,
            avgScore: avgMarks[0].avg_marks || 0,
            pendingAssignments: pendingAssignments[0].count,
            unreadMessages: unreadMsgs[0].count,
            unreadNotifications: unreadNotifs[0].count,
            recentActivity,
            nextSession: nextSession.length > 0 ? nextSession[0] : null
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error fetching dashboard' });
    }
});

// ─── GET /api/dashboard/tutor ── Real-time tutor dashboard stats ───
router.get('/tutor', async (req, res) => {
    try {
        const email = req.user.email;
        const name = req.user.name;

        // Active students count
        const [students] = await db.execute(
            `SELECT COUNT(*) AS count FROM booking_request WHERE teacher_email = ? AND status = 'accepted'`,
            [email]
        );

        // Pending requests 
        const [pending] = await db.execute(
            `SELECT COUNT(*) AS count FROM booking_request WHERE teacher_email = ? AND status = 'pending'`,
            [email]
        );

        // Today's sessions
        const [todaySessions] = await db.execute(
            `SELECT COUNT(*) AS count FROM sessions WHERE teacher_email = ? AND session_date = CURDATE() AND status = 'scheduled'`,
            [email]
        );

        // Upcoming sessions this week
        const [weekSessions] = await db.execute(
            `SELECT COUNT(*) AS count FROM sessions 
             WHERE teacher_email = ? AND session_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND status = 'scheduled'`,
            [email]
        );

        // Tests created
        const [totalTests] = await db.execute(
            `SELECT COUNT(*) AS count FROM tests WHERE teacher_email = ?`,
            [email]
        );

        // Ungraded submissions
        const [ungraded] = await db.execute(
            `SELECT COUNT(*) AS count FROM test_submissions WHERE teacher_name = ? AND marks IS NULL`,
            [name]
        );

        // Ungraded assignments
        const [ungradedAssignments] = await db.execute(
            `SELECT COUNT(*) AS count FROM assignment_submissions asub
             JOIN assignments a ON asub.assignment_id = a.id
             WHERE a.teacher_email = ? AND asub.marks IS NULL`,
            [email]
        );

        // Average rating
        const [avgRating] = await db.execute(
            `SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS total_reviews FROM reviews WHERE teacher_email = ?`,
            [email]
        );

        // Unread messages
        const [unreadMsgs] = await db.execute(
            `SELECT COUNT(*) AS count FROM messages WHERE receiver_email = ? AND is_read = FALSE`,
            [email]
        );

        // Unread notifications
        const [unreadNotifs] = await db.execute(
            `SELECT COUNT(*) AS count FROM notifications WHERE user_email = ? AND status = 'unread'`,
            [email]
        );

        // Next session
        const [nextSession] = await db.execute(`
            SELECT s.*, sl.name AS student_name 
            FROM sessions s
            JOIN student_login sl ON s.student_email = sl.email
            WHERE s.teacher_email = ? AND s.session_date >= CURDATE() AND s.status = 'scheduled'
            ORDER BY s.session_date ASC, s.start_time ASC LIMIT 1
        `, [email]);

        // Recent activity
        const [recentActivity] = await db.execute(
            `SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 5`,
            [email]
        );

        res.json({
            activeStudents: students[0].count,
            pendingRequests: pending[0].count,
            todaySessions: todaySessions[0].count,
            weekSessions: weekSessions[0].count,
            totalTests: totalTests[0].count,
            ungradedSubmissions: ungraded[0].count,
            ungradedAssignments: ungradedAssignments[0].count,
            avgRating: avgRating[0].avg_rating || 0,
            totalReviews: avgRating[0].total_reviews,
            unreadMessages: unreadMsgs[0].count,
            unreadNotifications: unreadNotifs[0].count,
            nextSession: nextSession.length > 0 ? nextSession[0] : null,
            recentActivity
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error fetching dashboard' });
    }
});

module.exports = router;
