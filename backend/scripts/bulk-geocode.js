/**
 * One-time bulk geocode script
 * Run: node scripts/bulk-geocode.js
 *
 * Geocodes ALL students and teachers who have an address but no lat/lng.
 * Respects Nominatim rate limit (1 request/second).
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const pool = require('../db');
const { geocodeAddress } = require('../utils/geocode');

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function run() {
    let updated = 0;
    let failed = 0;

    console.log('🗺️  Starting bulk geocode...\n');

    // ── Students ──────────────────────────────────────────────────────
    const [students] = await pool.query(
        `SELECT email, name, address, city, pincode 
         FROM student_login 
         WHERE (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0) 
           AND address IS NOT NULL 
           AND address != ''`
    );

    console.log(`Found ${students.length} students without location.`);

    for (const s of students) {
        try {
            const geo = await geocodeAddress(s.address, s.city, s.pincode);
            if (geo) {
                await pool.query(
                    'UPDATE student_login SET latitude = ?, longitude = ? WHERE email = ?',
                    [geo.latitude, geo.longitude, s.email]
                );
                console.log(`✅ Student [${s.name}] → ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}  (${s.city || s.pincode})`);
                updated++;
            } else {
                console.log(`⚠️  Student [${s.name}] → No result for "${s.address}, ${s.city}, ${s.pincode}"`);
                failed++;
            }
        } catch (err) {
            console.error(`❌ Student [${s.name}] → Error: ${err.message}`);
            failed++;
        }
        // Nominatim rate limit: 1 req/sec
        await sleep(1200);
    }

    // ── Teachers ──────────────────────────────────────────────────────
    const [teachers] = await pool.query(
        `SELECT email, name, address, pincode 
         FROM teacher_login 
         WHERE (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0) 
           AND address IS NOT NULL 
           AND address != ''`
    );

    console.log(`\nFound ${teachers.length} teachers without location.`);

    for (const t of teachers) {
        try {
            const geo = await geocodeAddress(t.address, null, t.pincode);
            if (geo) {
                await pool.query(
                    'UPDATE teacher_login SET latitude = ?, longitude = ? WHERE email = ?',
                    [geo.latitude, geo.longitude, t.email]
                );
                console.log(`✅ Teacher [${t.name}] → ${geo.latitude.toFixed(4)}, ${geo.longitude.toFixed(4)}  (${t.pincode})`);
                updated++;
            } else {
                console.log(`⚠️  Teacher [${t.name}] → No result for "${t.address}, ${t.pincode}"`);
                failed++;
            }
        } catch (err) {
            console.error(`❌ Teacher [${t.name}] → Error: ${err.message}`);
            failed++;
        }
        await sleep(1200);
    }

    console.log(`\n──────────────────────────────────────`);
    console.log(`✅ Updated : ${updated}`);
    console.log(`⚠️  Failed  : ${failed}`);
    console.log(`──────────────────────────────────────`);
    process.exit(0);
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
