const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /api/messages/unread/count ── Must be BEFORE /:email ───
router.get('/unread/count', async (req, res) => {
    try {
        const userEmail = req.user.email;
        const [result] = await db.execute(
            `SELECT COUNT(*) AS count FROM messages WHERE receiver_email = ? AND is_read = FALSE`,
            [userEmail]
        );
        res.json({ count: result[0].count });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── GET /api/messages/conversations ── Get list of conversations ───
router.get('/conversations', async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Step 1: Get distinct conversation partners
        const [partners] = await db.execute(`
            SELECT DISTINCT
                CASE 
                    WHEN sender_email = ? THEN receiver_email 
                    ELSE sender_email 
                END AS other_email
            FROM messages
            WHERE sender_email = ? OR receiver_email = ?
        `, [userEmail, userEmail, userEmail]);

        const enriched = [];

        for (const row of partners) {
            const otherEmail = row.other_email;

            // Get last message
            const [lastMsgRows] = await db.execute(`
                SELECT message_text, created_at FROM messages
                WHERE (sender_email = ? AND receiver_email = ?) OR (sender_email = ? AND receiver_email = ?)
                ORDER BY created_at DESC LIMIT 1
            `, [userEmail, otherEmail, otherEmail, userEmail]);

            // Get unread count from the other person
            const [unreadRows] = await db.execute(`
                SELECT COUNT(*) AS cnt FROM messages
                WHERE sender_email = ? AND receiver_email = ? AND is_read = FALSE
            `, [otherEmail, userEmail]);

            // Get name
            const [student] = await db.execute('SELECT name FROM student_login WHERE email = ?', [otherEmail]);
            const [teacher] = await db.execute('SELECT name FROM teacher_login WHERE email = ?', [otherEmail]);
            const name = student.length > 0 ? student[0].name : (teacher.length > 0 ? teacher[0].name : otherEmail);
            const role = student.length > 0 ? 'Student' : 'Teacher';

            enriched.push({
                other_email: otherEmail,
                other_name: name,
                other_role: role,
                last_message: lastMsgRows.length > 0 ? lastMsgRows[0].message_text : '',
                last_message_at: lastMsgRows.length > 0 ? lastMsgRows[0].created_at : null,
                unread_count: unreadRows[0].cnt
            });
        }

        // Sort by last message time
        enriched.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

        res.json(enriched);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── GET /api/messages/:email ── Get messages with a specific user ───
router.get('/:email', async (req, res) => {
    try {
        const userEmail = req.user.email;
        const otherEmail = req.params.email;

        const [messages] = await db.execute(`
            SELECT * FROM messages 
            WHERE (sender_email = ? AND receiver_email = ?) OR (sender_email = ? AND receiver_email = ?)
            ORDER BY created_at ASC
        `, [userEmail, otherEmail, otherEmail, userEmail]);

        // Mark messages from other user as read
        await db.execute(
            `UPDATE messages SET is_read = TRUE WHERE sender_email = ? AND receiver_email = ? AND is_read = FALSE`,
            [otherEmail, userEmail]
        );

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── POST /api/messages ── Send a message ───
router.post('/', async (req, res) => {
    try {
        const senderEmail = req.user.email;
        const { receiver_email, message_text } = req.body;

        if (!receiver_email || !message_text || message_text.trim() === '') {
            return res.status(400).json({ error: 'Receiver and message text are required.' });
        }

        const [result] = await db.execute(
            `INSERT INTO messages (sender_email, receiver_email, message_text) VALUES (?, ?, ?)`,
            [senderEmail, receiver_email, message_text.trim()]
        );

        const [newMsg] = await db.execute('SELECT * FROM messages WHERE id = ?', [result.insertId]);

        res.json({ success: true, message: newMsg[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error sending message' });
    }
});

module.exports = router;
