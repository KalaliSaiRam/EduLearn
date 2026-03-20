const express = require('express');
const router = express.Router();
const pool = require('../db');
const { geocodeAddress } = require('../utils/geocode');

// ─── POST /api/geocode/update-my-location ── Geocode current user's address ───
router.post('/update-my-location', async (req, res) => {
    try {
        const userEmail = req.user.email;
        const userRole = req.user.role;

        let table, addressFields;
        if (userRole === 'student') {
            table = 'student_login';
            const [rows] = await pool.query('SELECT address, city, pincode FROM student_login WHERE email = ?', [userEmail]);
            if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
            addressFields = rows[0];
        } else {
            table = 'teacher_login';
            const [rows] = await pool.query('SELECT address, pincode FROM teacher_login WHERE email = ?', [userEmail]);
            if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
            addressFields = rows[0];
        }

        const geo = await geocodeAddress(addressFields.address, addressFields.city || null, addressFields.pincode);
        
        if (!geo) {
            return res.status(400).json({ error: 'Could not geocode your address. Try updating your address with more detail.' });
        }

        await pool.query(`UPDATE ${table} SET latitude = ?, longitude = ? WHERE email = ?`, 
            [geo.latitude, geo.longitude, userEmail]);

        res.json({ 
            success: true, 
            latitude: geo.latitude, 
            longitude: geo.longitude,
            display_name: geo.display_name,
            message: 'Location updated successfully!'
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ─── POST /api/geocode/bulk-update ── Geocode ALL users who don't have lat/lng yet ───
router.post('/bulk-update', async (req, res) => {
    try {
        let updatedCount = 0;

        // Geocode students without location
        const [students] = await pool.query(
            'SELECT email, address, city, pincode FROM student_login WHERE latitude IS NULL AND address IS NOT NULL'
        );
        for (const s of students) {
            const geo = await geocodeAddress(s.address, s.city, s.pincode);
            if (geo) {
                await pool.query('UPDATE student_login SET latitude = ?, longitude = ? WHERE email = ?',
                    [geo.latitude, geo.longitude, s.email]);
                updatedCount++;
                console.log(`📍 Geocoded student ${s.email}: ${geo.latitude}, ${geo.longitude}`);
            }
            // Nominatim rate limit: 1 request per second
            await new Promise(r => setTimeout(r, 1100));
        }

        // Geocode teachers without location
        const [teachers] = await pool.query(
            'SELECT email, address, pincode FROM teacher_login WHERE latitude IS NULL AND address IS NOT NULL'
        );
        for (const t of teachers) {
            const geo = await geocodeAddress(t.address, null, t.pincode);
            if (geo) {
                await pool.query('UPDATE teacher_login SET latitude = ?, longitude = ? WHERE email = ?',
                    [geo.latitude, geo.longitude, t.email]);
                updatedCount++;
                console.log(`📍 Geocoded teacher ${t.email}: ${geo.latitude}, ${geo.longitude}`);
            }
            await new Promise(r => setTimeout(r, 1100));
        }

        res.json({ 
            success: true, 
            message: `Geocoded ${updatedCount} users.`,
            students_processed: students.length,
            teachers_processed: teachers.length,
            updated: updatedCount
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during bulk geocoding' });
    }
});

module.exports = router;
