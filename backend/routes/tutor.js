const express = require('express');
const router = express.Router();
const db = require('../db');

// Get progress of all students for a specific tutor
router.get('/student-progress', async (req, res) => {
    try {
        const teacherName = req.user.name; // From auth middleware
        const teacherEmail = req.user.email; // From auth middleware

        // 1. Fetch the tutor's type (Professional or Peer) using email (unique)
        const [typeQuery] = await db.execute(
            `SELECT type FROM teacher_login WHERE email = ?`,
            [teacherEmail]
        );
        const tutorType = typeQuery.length > 0 ? typeQuery[0].type : '';

        // 2. Get total tests created by the tutor
        const [totalTestsQuery] = await db.execute(
            `SELECT COUNT(*) AS total_tests FROM tests WHERE teacher_name = ?`,
            [teacherName]
        );
        const totalTests = totalTestsQuery[0].total_tests;

        // 3. Fetch all students accepted by this teacher and their submission/marks info
        const [studentsProgress] = await db.execute(`
            SELECT 
                br.username AS student_name,
                br.email AS student_email,
                COUNT(ts.id) AS total_tests_submitted,
                AVG(ts.marks) AS average_marks
            FROM booking_request br
            LEFT JOIN test_submissions ts 
                ON br.email = ts.student_email 
                AND ts.teacher_name = ?
            WHERE br.status = 'accepted' 
              AND br.required_tutor_type = ?
              AND br.teacher_email = ?
            GROUP BY br.email, br.username
        `, [teacherName, tutorType, teacherEmail]);

        // Format data to match exactly how PHP handled it
        const formattedProgress = studentsProgress.map(row => {
            const submitted = row.total_tests_submitted;
            const avgRaw = row.average_marks;
            const avg_marks = avgRaw === null ? '-' : parseFloat(avgRaw).toFixed(2);
            const percent = totalTests > 0 ? Math.round((submitted / totalTests) * 100) : 0;
            
            return {
                student_name: row.student_name,
                student_email: row.student_email,
                total_tests: totalTests,
                total_tests_submitted: submitted,
                percent: percent,
                average_marks: avg_marks
            };
        });

        res.json({
            total_tests: totalTests,
            students: formattedProgress
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get tutor notifications (requests)
router.get('/notifications', async (req, res) => {
    try {
        const teacherEmail = req.user.email;

        // Fetch tutor type using email (unique) instead of name
        const [typeQuery] = await db.execute(
            `SELECT type FROM teacher_login WHERE email = ?`,
            [teacherEmail]
        );
        const tutorType = typeQuery.length > 0 ? typeQuery[0].type : '';

        // Fetch pending requests for this tutor type that are either
        // specifically directed at this tutor OR are general requests
        const [requests] = await db.execute(`
            SELECT br.*, sl.address, sl.pincode 
            FROM booking_request br
            JOIN student_login sl ON br.email = sl.email
            WHERE br.required_tutor_type = ? 
              AND br.status = 'pending'
              AND (br.teacher_email = ? OR br.teacher_email IS NULL OR br.teacher_email = '')
        `, [tutorType, teacherEmail]);

        res.json(requests);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Handle request action (accept/reject/pending)
router.post('/notifications/action', async (req, res) => {
    try {
        const teacherEmail = req.user.email;
        const teacherName = req.user.name;
        const { request_id, action } = req.body;

        const actionMap = { 'accept': 'accepted', 'reject': 'rejected', 'pending': 'pending' };
        const mappedAction = actionMap[action] || 'pending';

        if (mappedAction === 'accepted') {
            await db.execute(
                `UPDATE booking_request SET status = ?, teacher_email = ?, teacher_name = ? WHERE id = ?`,
                [mappedAction, teacherEmail, teacherName, request_id]
            );
        } else {
            await db.execute(
                `UPDATE booking_request SET status = ? WHERE id = ?`,
                [mappedAction, request_id]
            );
        }

        // Fetch student's email and username for notification
        const [studentQuery] = await db.execute(
            `SELECT email, username FROM booking_request WHERE id = ?`,
            [request_id]
        );
        
        if (studentQuery.length > 0) {
            const student = studentQuery[0];
            const message = `Your demo request has been ${mappedAction} by <strong>${teacherName}</strong>.`;
            
            await db.execute(
                `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
                [student.email, message]
            );
        }

        res.json({ msg: `Student has been notified that their request was ${mappedAction}.` });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Create a new test (and its questions)
router.post('/create-test', async (req, res) => {
    try {
        const teacherName = req.user.name;
        const teacherEmail = req.user.email;
        const { subject, test_title, description, questions } = req.body;

        if (!subject || !test_title || !questions || !Array.isArray(questions) || questions.length === 0) {
            return res.status(400).json({ error: "Missing required fields or questions." });
        }

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            // Insert into tests table
            const [testResult] = await connection.execute(
                `INSERT INTO tests (teacher_name, teacher_email, subject, test_title, description) VALUES (?, ?, ?, ?, ?) RETURNING id`,
                [teacherName, teacherEmail, subject, test_title, description]
            );
            const testId = testResult[0].id;

            // Insert questions
            for (let i = 0; i < questions.length; i++) {
                const qText = questions[i].trim();
                if (qText !== "") {
                    await connection.execute(
                        `INSERT INTO test_questions (test_id, question) VALUES (?, ?)`,
                        [testId, qText]
                    );
                }
            }

            // Send notifications to students who have accepted bookings
            const notifMessage = `<strong>${teacherName}</strong> created a new test '<b>${test_title}</b>' for subject <strong>${subject}</strong>.`;
            
            // For now, simplify the logic to notify any student accepted under this teacher
            const [students] = await connection.execute(
                `SELECT email FROM booking_request WHERE status = 'accepted' AND teacher_email = ?`,
                [teacherEmail]
            );

            for (const student of students) {
                await connection.execute(
                    `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
                    [student.email, notifMessage]
                );
            }

            await connection.commit();
            res.json({ success: true, message: "Test created successfully!" });
        } catch (dbErr) {
            await connection.rollback();
            throw dbErr;
        } finally {
            connection.release();
        }

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get all distinct test titles created by this tutor
router.get('/tests', async (req, res) => {
    try {
        const teacherName = req.user.name;
        const [tests] = await db.execute(
            `SELECT DISTINCT test_title FROM tests WHERE teacher_name = ?`,
            [teacherName]
        );
        res.json(tests);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// Get submissions for a specific test title
router.get('/submissions/:testTitle', async (req, res) => {
    try {
        const teacherName = req.user.name;
        const testTitle = req.params.testTitle;

        const [submissions] = await db.execute(`
            SELECT ts.*, sl.name AS student_name 
            FROM test_submissions ts 
            JOIN student_login sl ON ts.student_email = sl.email 
            WHERE ts.test_title = ? AND ts.teacher_name = ?
        `, [testTitle, teacherName]);

        res.json(submissions);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error fetching submissions' });
    }
});

// Update marks for a submission
router.post('/grade-submission', async (req, res) => {
    try {
        const { submission_id, marks } = req.body;
        
        if (!submission_id || marks === undefined) {
             return res.status(400).json({ error: "Missing submission ID or marks" });
        }

        await db.execute(
            `UPDATE test_submissions SET marks = ? WHERE id = ?`,
            [marks, submission_id]
        );

        res.json({ success: true, message: "Grade saved successfully" });
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error grading submission' });
    }
});

// Get accepted students for a tutor
router.get('/mystudents', async (req, res) => {
    try {
        const teacherEmail = req.user.email;
        const tutorType = req.user.type; // 'Professional' or 'Peer'

        const [students] = await db.execute(`
            SELECT br.*, sl.address, sl.pincode, sl.name AS username 
            FROM booking_request br
            JOIN student_login sl ON br.email = sl.email
            WHERE br.required_tutor_type = ? 
              AND br.status = 'accepted' 
              AND br.teacher_email = ?
        `, [tutorType, teacherEmail]);

        res.json(students);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error fetching students' });
    }
});

// Get accepted students with location for map
router.get('/mystudents-with-location', async (req, res) => {
    try {
        const teacherEmail = req.user.email;

        const [students] = await db.execute(`
            SELECT br.username, br.email, br.subject, br.contact_number,
                   sl.address, sl.pincode, sl.city, sl.latitude, sl.longitude, sl.name
            FROM booking_request br
            JOIN student_login sl ON br.email = sl.email
            WHERE br.status = 'accepted' 
              AND br.teacher_email = ?
        `, [teacherEmail]);

        res.json(students);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

module.exports = router;

