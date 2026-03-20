const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer setup for assignment file uploads
const uploadDir = 'uploads/assignments/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '_' + file.originalname)
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png', '.zip'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed. Allowed: PDF, DOC, DOCX, TXT, JPG, PNG, ZIP'), false);
        }
    },
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ─── POST /api/assignments ── Create a new assignment (tutor) ───
router.post('/', upload.single('attachment'), async (req, res) => {
    try {
        const teacherEmail = req.user.email;
        const teacherName = req.user.name;
        const { title, description, subject, due_date, max_marks } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Assignment title is required.' });
        }

        const attachmentPath = req.file ? req.file.path.replace(/\\/g, '/') : null;

        const [result] = await db.execute(
            `INSERT INTO assignments (teacher_email, teacher_name, title, description, subject, due_date, max_marks, attachment_path)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [teacherEmail, teacherName, title, description || null, subject || null, due_date || null, max_marks || 100, attachmentPath]
        );

        // Notify all accepted students
        const [students] = await db.execute(
            `SELECT email FROM booking_request WHERE teacher_email = ? AND status = 'accepted'`,
            [teacherEmail]
        );

        for (const student of students) {
            await db.execute(
                `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
                [student.email, `<strong>${teacherName}</strong> posted a new assignment "<b>${title}</b>"${due_date ? ` — Due: ${due_date}` : ''}.`]
            );
        }

        res.json({ success: true, message: 'Assignment created!', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error creating assignment' });
    }
});

// ─── GET /api/assignments/tutor ── Get all assignments created by tutor ───
router.get('/tutor', async (req, res) => {
    try {
        const teacherEmail = req.user.email;
        const [assignments] = await db.execute(
            `SELECT a.*, 
                (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id) AS submissions_count,
                (SELECT COUNT(*) FROM assignment_submissions WHERE assignment_id = a.id AND marks IS NOT NULL) AS graded_count
             FROM assignments a WHERE a.teacher_email = ? ORDER BY a.created_at DESC`,
            [teacherEmail]
        );
        res.json(assignments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── GET /api/assignments/student ── Get assignments for student ───
router.get('/student', async (req, res) => {
    try {
        const studentEmail = req.user.email;

        // Get all assignments from accepted tutors
        const [assignments] = await db.execute(`
            SELECT a.*, 
                tl.name AS teacher_name,
                asub.id AS submission_id,
                asub.marks AS my_marks,
                asub.feedback AS my_feedback,
                asub.submitted_at AS my_submitted_at,
                asub.submission_path AS my_submission_path
            FROM assignments a
            JOIN booking_request br ON a.teacher_email = br.teacher_email
            JOIN teacher_login tl ON a.teacher_email = tl.email
            LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id AND asub.student_email = ?
            WHERE br.email = ? AND br.status = 'accepted'
            ORDER BY a.due_date ASC, a.created_at DESC
        `, [studentEmail, studentEmail]);

        res.json(assignments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── POST /api/assignments/:id/submit ── Student submits an assignment ───
router.post('/:id/submit', upload.single('submission'), async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const studentName = req.user.name;
        const assignmentId = req.params.id;

        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a file.' });
        }

        // Check not already submitted
        const [existing] = await db.execute(
            `SELECT id FROM assignment_submissions WHERE assignment_id = ? AND student_email = ?`,
            [assignmentId, studentEmail]
        );
        if (existing.length > 0) {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'You have already submitted this assignment.' });
        }

        const submissionPath = req.file.path.replace(/\\/g, '/');
        await db.execute(
            `INSERT INTO assignment_submissions (assignment_id, student_email, student_name, submission_path) VALUES (?, ?, ?, ?)`,
            [assignmentId, studentEmail, studentName, submissionPath]
        );

        // Notify tutor
        const [assignment] = await db.execute('SELECT teacher_email, title FROM assignments WHERE id = ?', [assignmentId]);
        if (assignment.length > 0) {
            await db.execute(
                `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
                [assignment[0].teacher_email, `${studentName} submitted assignment "<b>${assignment[0].title}</b>".`]
            );
        }

        res.json({ success: true, message: 'Assignment submitted!' });
    } catch (err) {
        console.error(err);
        if (req.file) try { fs.unlinkSync(req.file.path); } catch(e) {}
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── GET /api/assignments/:id/submissions ── Tutor views submissions for an assignment ───
router.get('/:id/submissions', async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const [submissions] = await db.execute(`
            SELECT asub.*, sl.name AS student_name
            FROM assignment_submissions asub
            JOIN student_login sl ON asub.student_email = sl.email
            WHERE asub.assignment_id = ?
            ORDER BY asub.submitted_at DESC
        `, [assignmentId]);

        res.json(submissions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error' });
    }
});

// ─── POST /api/assignments/grade ── Grade an assignment submission ───
router.post('/grade', async (req, res) => {
    try {
        const { submission_id, marks, feedback } = req.body;

        if (!submission_id || marks === undefined) {
            return res.status(400).json({ error: 'Submission ID and marks required.' });
        }

        await db.execute(
            `UPDATE assignment_submissions SET marks = ?, feedback = ?, graded_at = NOW() WHERE id = ?`,
            [marks, feedback || null, submission_id]
        );

        // Notify student
        const [sub] = await db.execute(
            `SELECT asub.student_email, a.title FROM assignment_submissions asub JOIN assignments a ON asub.assignment_id = a.id WHERE asub.id = ?`,
            [submission_id]
        );
        if (sub.length > 0) {
            await db.execute(
                `INSERT INTO notifications (user_email, message, status, created_at) VALUES (?, ?, 'unread', NOW())`,
                [sub[0].student_email, `Your assignment "<b>${sub[0].title}</b>" has been graded by <strong>${req.user.name}</strong>. Marks: <b>${marks}</b>.`]
            );
        }

        res.json({ success: true, message: 'Assignment graded!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server Error grading assignment' });
    }
});

module.exports = router;
