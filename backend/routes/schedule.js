const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /api/schedule/student ── Get student's scheduled sessions ───
router.get('/student', async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const [sessions] = await db.execute(`
            SELECT s.*, tl.name AS teacher_name, tl.subject
            FROM sessions s
            JOIN teacher_login tl ON s.teacher_email = tl.email
            WHERE s.student_email = ?
            ORDER BY s.session_date ASC, s.start_time ASC
        `, [studentEmail]);

        res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── GET /api/schedule/tutor ── Get tutor's scheduled sessions ───
router.get('/tutor', async (req, res) => {
    try {
        const teacherEmail = req.user.email;
        const [sessions] = await db.execute(`
            SELECT s.*, sl.name AS student_name, sl.phone AS student_phone
            FROM sessions s
            JOIN student_login sl ON s.student_email = sl.email
            WHERE s.teacher_email = ?
            ORDER BY s.session_date ASC, s.start_time ASC
        `, [teacherEmail]);

        res.json(sessions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── POST /api/schedule ── Create a new session (tutor) ───
router.post('/', async (req, res) => {
    try {
        const teacherEmail = req.user.email;
        const { student_email, session_date, start_time, end_time, subject, topic, notes, booking_id } = req.body;

        if (!student_email || !session_date || !start_time || !end_time) {
            return res.status(400).json({ error: 'Student, date, start time, and end time are required.' });
        }

        // Verify this student is accepted
        const [booking] = await db.execute(
            `SELECT id FROM booking_request WHERE email = ? AND teacher_email = ? AND status = 'accepted'`,
            [student_email, teacherEmail]
        );
        if (booking.length === 0) {
            return res.status(403).json({ error: 'Student is not in your accepted list.' });
        }

        // Check for scheduling conflicts
        const [conflicts] = await db.execute(`
            SELECT id FROM sessions 
            WHERE teacher_email = ? AND session_date = ? AND status = 'scheduled'
            AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))
        `, [teacherEmail, session_date, start_time, start_time, end_time, end_time, start_time, end_time]);

        if (conflicts.length > 0) {
            return res.status(400).json({ error: 'You have a scheduling conflict at this time.' });
        }

        await db.execute(
            `INSERT INTO sessions (booking_id, teacher_email, student_email, session_date, start_time, end_time, subject, topic, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [booking_id || booking[0].id, teacherEmail, student_email, session_date, start_time, end_time, subject || null, topic || null, notes || null]
        );

        // Notify student
        const teacherName = req.user.name;
        await db.execute(
            `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
            [student_email, `${teacherName} scheduled a session on <b>${session_date}</b> from <b>${start_time}</b> to <b>${end_time}</b>.`]
        );

        res.json({ success: true, message: 'Session scheduled!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error scheduling session' });
    }
});

// ─── PUT /api/schedule/:id/status ── Update session status ───
router.put('/:id/status', async (req, res) => {
    try {
        const sessionId = req.params.id;
        const { status } = req.body;
        const validStatuses = ['scheduled', 'in-progress', 'completed', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }

        await db.execute(`UPDATE sessions SET status = ? WHERE id = ?`, [status, sessionId]);

        // Get session info for notification
        const [session] = await db.execute(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
        if (session.length > 0) {
            const s = session[0];
            const userEmail = req.user.email;
            const notifyEmail = userEmail === s.teacher_email ? s.student_email : s.teacher_email;
            
            await db.execute(
                `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
                [notifyEmail, `<strong>${req.user.name}</strong> marked session on ${s.session_date} as <b>${status}</b>.`]
            );
        }

        res.json({ success: true, message: `Session marked as ${status}.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── DELETE /api/schedule/:id ── Cancel/delete a session ───
router.delete('/:id', async (req, res) => {
    try {
        const sessionId = req.params.id;
        
        const [session] = await db.execute(`SELECT * FROM sessions WHERE id = ?`, [sessionId]);
        if (session.length === 0) {
            return res.status(404).json({ error: 'Session not found.' });
        }

        await db.execute(`UPDATE sessions SET status = 'cancelled' WHERE id = ?`, [sessionId]);

        const s = session[0];
        const userEmail = req.user.email;
        const notifyEmail = userEmail === s.teacher_email ? s.student_email : s.teacher_email;
        
        await db.execute(
            `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
            [notifyEmail, `<strong>${req.user.name}</strong> cancelled the session on ${s.session_date}.`]
        );

        res.json({ success: true, message: 'Session cancelled.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;
