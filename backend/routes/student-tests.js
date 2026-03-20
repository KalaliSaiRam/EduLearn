const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "_" + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
});

// Existing Route: Get all tests assigned to this student
router.get('/tests', async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const [bookingCheck] = await db.execute(
            `SELECT teacher_name, teacher_email FROM booking_request WHERE email = ? AND status = 'accepted'`,
            [studentEmail]
        );

        if (bookingCheck.length === 0) {
            return res.json({ msg: "No accepted tutor found. You cannot view tests.", tests: [] });
        }

        const teacher_name = bookingCheck[0].teacher_name;
        // Exclude tests the student has already submitted
        const [tests] = await db.execute(`
            SELECT DISTINCT * 
            FROM tests 
            WHERE teacher_name = ? 
            AND id NOT IN (
                SELECT test_id 
                FROM test_submissions 
                WHERE student_email = ?
            )
        `, [teacher_name, studentEmail]);

        res.json({ tests });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// New Route: Submit a test
router.post('/submit', upload.single('pdf_file'), async (req, res) => {
    try {
        const studentEmail = req.user.email;
        const testId = req.body.test_id;

        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a PDF file.' });
        }
        
        if (!testId) {
             // Clean up uploaded file if testId is missing
             fs.unlinkSync(req.file.path);
             return res.status(400).json({ error: 'Test ID is required.' });
        }

        const targetPath = req.file.path;

        // Get the test title and teacher name
        const [testResult] = await db.execute(
            `SELECT test_title, teacher_name FROM tests WHERE id = ?`,
            [testId]
        );

        if (testResult.length === 0) {
            fs.unlinkSync(targetPath);
            return res.status(404).json({ error: 'Test not found.' });
        }

        const testTitle = testResult[0].test_title;
        const teacherName = testResult[0].teacher_name;

        // Ensure not already submitted
        const [existing] = await db.execute(
            `SELECT * FROM test_submissions WHERE student_email = ? AND test_id = ?`,
            [studentEmail, testId]
        );

        if (existing.length > 0) {
            fs.unlinkSync(targetPath);
            return res.status(400).json({ error: 'You have already submitted this test.' });
        }

        // Insert into test_submissions
        await db.execute(
            `INSERT INTO test_submissions (student_email, test_id, test_title, pdf_path, submitted_at, teacher_name) 
             VALUES (?, ?, ?, ?, NOW(), ?)`,
            [studentEmail, testId, testTitle, targetPath.replace(/\\/g, '/'), teacherName] 
        );

        res.json({ msg: 'Submission successful!' });

    } catch (err) {
        console.error(err);
        // Clean up partial upload if failure
        if (req.file && req.file.path) {
            try { fs.unlinkSync(req.file.path); } catch(e){}
        }
        res.status(500).json({ error: 'Server Error during submission' });
    }
});


// Get specific test questions manually
router.get('/:testId/questions', async (req, res) => {
    try {
        const { testId } = req.params;
        const [questions] = await db.execute(`SELECT * FROM test_questions WHERE test_id = ?`, [testId]);
        
        const [testDetails] = await db.execute(`SELECT * FROM tests WHERE id = ?`, [testId]);
        
        if(testDetails.length === 0) {
            return res.status(404).json({ error: "Test not found" });
        }

        res.json({ test: testDetails[0], questions });
    } catch(err) {
         console.error(err.message);
         res.status(500).send('Server Error');
    }
});


module.exports = router;
