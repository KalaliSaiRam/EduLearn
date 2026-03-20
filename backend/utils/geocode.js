/**
 * Geocode an address to lat/lng using OpenStreetMap Nominatim (free, no API key)
 * 
 * Usage: const { lat, lng } = await geocodeAddress('Kukatpally, Hyderabad, 500072');
 */

async function geocodeAddress(address, city, pincode) {
    try {
        // Build a search query from available fields
        const parts = [address, city, pincode, 'India'].filter(Boolean);
        const query = parts.join(', ');
        
        const url = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'in'
        });

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'EduLearning-App/1.0'  // Required by Nominatim policy
            }
        });

        const data = await response.json();

        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }

        // Fallback: try with just city + pincode
        if (city || pincode) {
            const fallbackQuery = [city, pincode, 'India'].filter(Boolean).join(', ');
            const fallbackUrl = `https://nominatim.openstreetmap.org/search?` + new URLSearchParams({
                q: fallbackQuery,
                format: 'json',
                limit: '1',
                countrycodes: 'in'
            });

            const fbRes = await fetch(fallbackUrl, {
                headers: { 'User-Agent': 'EduLearning-App/1.0' }
            });
            const fbData = await fbRes.json();

            if (fbData && fbData.length > 0) {
                return {
                    latitude: parseFloat(fbData[0].lat),
                    longitude: parseFloat(fbData[0].lon),
                    display_name: fbData[0].display_name
                };
            }
        }

        console.log(`⚠️ Geocoding: No results for "${query}"`);
        return null;
    } catch (err) {
        console.error('Geocoding error:', err.message);
        return null;
    }
}

module.exports = { geocodeAddress };
