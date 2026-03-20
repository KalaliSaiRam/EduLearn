import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import 'leaflet/dist/leaflet.css';

const TutorMap = () => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [studentLocation, setStudentLocation] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [bookingTutor, setBookingTutor] = useState(null);
  const [bookForm, setBookForm] = useState({ phone: '', subject: '', budget: '', timings: '' });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  // Fetch student profile for location AND phone pre-fill
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/profile/student', { headers: { 'x-auth-token': token } });
        const data = await res.json();
        setStudentProfile(data);
        if (data.latitude && data.longitude) setStudentLocation({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
      } catch (err) { console.error(err); }
    };
    fetchProfile();
  }, [token]);

  useEffect(() => {
    const fetchTutors = async () => {
      try {
        const url = filterType ? `http://localhost:5000/api/student/tutors?type=${filterType}` : 'http://localhost:5000/api/student/tutors';
        const res = await fetch(url, { headers: { 'x-auth-token': token } });
        const data = await res.json();
        setTutors(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchTutors();
  }, [token, filterType]);

  // When bookingTutor is set, pre-fill form from DB
  useEffect(() => {
    if (bookingTutor) {
      setBookForm({
        phone: studentProfile?.phone || '',
        subject: bookingTutor.subject || '',
        budget: '',
        timings: ''
      });
    }
  }, [bookingTutor, studentProfile]);

  // Gender avatar helper
  const getGenderIcon = (gender) => {
    if (!gender) return { icon: 'fas fa-chalkboard-teacher', color: '#7c3aed' };
    const g = gender.toLowerCase();
    if (g === 'female' || g === 'f') return { icon: 'fas fa-female', color: '#ec4899' };
    return { icon: 'fas fa-male', color: '#3b82f6' };
  };

  const getGenderAvatar = (gender, name) => {
    const g = (gender || '').toLowerCase();
    if (g === 'female' || g === 'f') {
      return { bg: '#ec4899', icon: 'fas fa-female', borderColor: '#f472b6' };
    }
    return { bg: '#3b82f6', icon: 'fas fa-male', borderColor: '#60a5fa' };
  };

  // Draw route using OSRM
  const drawRoute = async (tutor) => {
    if (!studentLocation || !tutor.latitude || !tutor.longitude || !mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;
    if (routeLayerRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${studentLocation.lng},${studentLocation.lat};${tutor.longitude},${tutor.latitude}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        const routeLine = L.polyline(coords, {
          color: '#7c3aed', weight: 5, opacity: 0.8,
          dashArray: '10, 6', lineCap: 'round'
        }).addTo(mapInstanceRef.current);
        routeLayerRef.current = routeLine;
        const distKm = (route.distance / 1000).toFixed(1);
        const durationMin = Math.round(route.duration / 60);
        setRouteInfo({ distance: distKm, duration: durationMin, tutorName: tutor.name });
        mapInstanceRef.current.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
      }
    } catch (err) { console.error('Routing error:', err); }
  };

  const clearRoute = async () => {
    if (routeLayerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    setRouteInfo(null);
    setSelectedTutor(null);
  };

  // Build map
  useEffect(() => {
    const initMap = async () => {
      const L = (await import('leaflet')).default;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });
      if (mapInstanceRef.current) mapInstanceRef.current.remove();

      const center = studentLocation ? [studentLocation.lat, studentLocation.lng] : [17.385, 78.4867];
      const map = L.map(mapRef.current).setView(center, 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

      // Student marker
      if (studentLocation) {
        const studentIcon = L.divIcon({
          html: '<div style="background:#3b82f6;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:3px solid white;box-shadow:0 3px 12px rgba(59,130,246,0.4)"><i class="fas fa-home"></i></div>',
          className: '', iconSize: [36, 36], iconAnchor: [18, 18]
        });
        L.marker([studentLocation.lat, studentLocation.lng], { icon: studentIcon }).addTo(map)
          .bindPopup('<div style="font-family:Inter,sans-serif;text-align:center;padding:4px"><b>🏠 Your Location</b></div>');
      }

      // Tutor markers with gender avatars
      const tutorsWithLocation = tutors.filter(t => t.latitude && t.longitude);
      const allPoints = [];
      if (studentLocation) allPoints.push([studentLocation.lat, studentLocation.lng]);

      tutorsWithLocation.forEach(tutor => {
        const avatar = getGenderAvatar(tutor.gender, tutor.name);
        const tutorIcon = L.divIcon({
          html: `<div style="background:${avatar.bg};color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:2.5px solid ${avatar.borderColor};box-shadow:0 3px 10px rgba(0,0,0,0.3)"><i class="${avatar.icon}"></i></div>`,
          className: '', iconSize: [34, 34], iconAnchor: [17, 17]
        });

        const stars = '★'.repeat(Math.round(tutor.rating || 0)) + '☆'.repeat(5 - Math.round(tutor.rating || 0));
        const dist = tutor.distance_km ? `${tutor.distance_km} km away` : '';

        L.marker([tutor.latitude, tutor.longitude], { icon: tutorIcon }).addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:220px;padding:4px 0">
              <h3 style="margin:0 0 3px;font-size:14px;font-weight:700">${tutor.name}</h3>
              <p style="margin:0 0 4px;font-size:12px;color:#888">${tutor.type} • ${tutor.subject || 'General'}</p>
              <p style="margin:0 0 4px;color:#f59e0b;font-size:13px">${stars}</p>
              <p style="font-size:12px;margin:0 0 8px;color:#666">
                ${tutor.hourly_rate ? '💰 ₹' + tutor.hourly_rate + '/hr' : ''} ${dist ? '• 📏 ' + dist : ''}
              </p>
              <div style="display:flex;gap:5px">
                <button onclick="window.__showDirections('${tutor.email}')" style="flex:1;padding:6px 8px;font-size:11px;font-weight:600;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer">🧭 Directions</button>
                <button onclick="window.__bookTutor('${tutor.email}')" style="flex:1;padding:6px 8px;font-size:11px;font-weight:600;background:#7c3aed;color:white;border:none;border-radius:6px;cursor:pointer">📩 Book</button>
                <button onclick="window.__msgTutor('${tutor.email}')" style="flex:1;padding:6px 8px;font-size:11px;font-weight:600;background:#10b981;color:white;border:none;border-radius:6px;cursor:pointer">💬 Msg</button>
              </div>
            </div>
          `)
          .on('click', () => setSelectedTutor(tutor));

        allPoints.push([tutor.latitude, tutor.longitude]);
      });

      if (allPoints.length > 1) map.fitBounds(allPoints, { padding: [50, 50] });
    };

    if (mapRef.current && !loading) initMap();
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [tutors, studentLocation, loading]);

  // Global popup button handlers
  useEffect(() => {
    window.__bookTutor = (email) => {
      const tutor = tutors.find(t => t.email === email);
      if (tutor) setBookingTutor(tutor);
    };
    window.__msgTutor = (email) => navigate(`/messages?to=${email}`);
    window.__showDirections = (email) => {
      const tutor = tutors.find(t => t.email === email);
      if (tutor) {
        setSelectedTutor(tutor);
        drawRoute(tutor);
      }
    };
    return () => { delete window.__bookTutor; delete window.__msgTutor; delete window.__showDirections; };
  }, [tutors, navigate, studentLocation]);

  const handleGeocodeMyLocation = async () => {
    setGeocoding(true);
    try {
      const res = await fetch('http://localhost:5000/api/geocode/update-my-location', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }
      });
      const data = await res.json();
      if (data.success) {
        setStudentLocation({ lat: data.latitude, lng: data.longitude });
        alert(`✅ Location updated!\n${data.display_name}`);
      } else alert(`❌ ${data.error}`);
    } catch (err) { alert('Failed to geocode'); }
    finally { setGeocoding(false); }
  };

  const handleBookDemo = async () => {
    if (!bookingTutor) return;
    setBookingLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/student/book-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          studentPhone: bookForm.phone,
          studentSubject: bookForm.subject || bookingTutor.subject,
          studentBudget: bookForm.budget,
          studentTimings: bookForm.timings,
          requiredTutorType: bookingTutor.type,
          tutorEmail: bookingTutor.email
        })
      });
      const data = await res.json();
      if (data.success) {
        setBookingTutor(null);
        setBookForm({ phone: '', subject: '', budget: '', timings: '' });
        // Redirect to bookings page
        navigate('/bookings');
      } else alert(data.error || 'Failed');
    } catch (err) { alert('Server error'); }
    finally { setBookingLoading(false); }
  };

  const renderStars = (rating) => [1,2,3,4,5].map(i => (
    <i key={i} className="fas fa-star" style={{ color: i <= Math.round(rating || 0) ? '#fbbf24' : 'var(--text-light)', fontSize: '0.8rem' }}></i>
  ));

  const tutorsOnMap = tutors.filter(t => t.latitude && t.longitude);
  const tutorsOffMap = tutors.filter(t => !t.latitude || !t.longitude);

  return (
    <Layout type="student">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.2rem' }}>
              <i className="fas fa-map-marked-alt text-primary" style={{ marginRight: '0.75rem' }}></i>Tutor Map
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <strong>{tutorsOnMap.length}</strong> tutors on map
              {studentLocation ? <span> • <span style={{color:'var(--success)'}}>📍 Location set</span></span> : <span> • <span style={{color:'var(--warning)'}}>⚠ Not set</span></span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {!studentLocation && (
              <button className="btn btn-secondary btn-sm" onClick={handleGeocodeMyLocation} disabled={geocoding}>
                <i className={`fas ${geocoding ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`}></i>
                {geocoding ? 'Finding...' : 'Set My Location'}
              </button>
            )}
            <div className="tabs" style={{ marginBottom: 0, width: 'auto' }}>
              <button className={`tab ${filterType === '' ? 'active' : ''}`} onClick={() => setFilterType('')}>All</button>
              <button className={`tab ${filterType === 'Professional' ? 'active' : ''}`} onClick={() => setFilterType('Professional')}>Pro</button>
              <button className={`tab ${filterType === 'Peer' ? 'active' : ''}`} onClick={() => setFilterType('Peer')}>Peer</button>
            </div>
          </div>
        </div>

        {/* Route Info Banner */}
        {routeInfo && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(59,130,246,0.1) 100%)',
            border: '1px solid rgba(124,58,237,0.2)', borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                <i className="fas fa-route" style={{ color: 'var(--primary)', marginRight: '0.4rem' }}></i>
                Directions to <strong>{routeInfo.tutorName}</strong>
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--info)', fontWeight: 600 }}>
                <i className="fas fa-road" style={{ marginRight: '0.3rem' }}></i>{routeInfo.distance} km
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                <i className="fas fa-clock" style={{ marginRight: '0.3rem' }}></i>~{routeInfo.duration} min drive
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={clearRoute} style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-times"></i> Clear Route
            </button>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', marginRight: 5, verticalAlign: 'middle' }}></span>You</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', marginRight: 5, verticalAlign: 'middle' }}></span>Male Tutor</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#ec4899', marginRight: 5, verticalAlign: 'middle' }}></span>Female Tutor</span>
          {routeInfo && <span><span style={{ display: 'inline-block', width: 14, height: 3, background: '#7c3aed', marginRight: 5, verticalAlign: 'middle', borderRadius: 2 }}></span>Route</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem' }}>
          <div ref={mapRef} style={{ height: '520px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}></div>

          <div className="card" style={{ maxHeight: '520px', overflowY: 'auto', padding: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
              Nearby Tutors ({tutorsOnMap.length})
            </h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '90px' }}></div>)}
              </div>
            ) : tutorsOnMap.length === 0 ? (
              <div className="empty-state"><i className="fas fa-map-marker-alt empty-state-icon"></i><h3>No tutors with locations</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {tutorsOnMap.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999)).map(tutor => {
                  const avatar = getGenderAvatar(tutor.gender, tutor.name);
                  return (
                    <div key={tutor.id}
                      onClick={() => {
                        setSelectedTutor(tutor);
                        if (mapInstanceRef.current) mapInstanceRef.current.setView([tutor.latitude, tutor.longitude], 15);
                      }}
                      style={{
                        padding: '0.75rem', border: `1.5px solid ${selectedTutor?.id === tutor.id ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        background: selectedTutor?.id === tutor.id ? 'var(--primary-light)' : 'var(--bg-input)', transition: 'var(--transition-fast)'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', background: avatar.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'white', fontSize: '0.85rem', flexShrink: 0,
                          border: `2px solid ${avatar.borderColor}`
                        }}>
                          <i className={avatar.icon}></i>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{tutor.name}</span>
                          {tutor.distance_km && <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 600, marginLeft: '0.5rem' }}>📏 {tutor.distance_km} km</span>}
                        </div>
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.3rem', paddingLeft: '2.5rem' }}>{tutor.subject || 'General'} • {tutor.type}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem', paddingLeft: '2.5rem' }}>
                        {renderStars(tutor.rating)}
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-light)' }}>({tutor.total_reviews || 0})</span>
                        {tutor.hourly_rate > 0 && <span style={{ color: 'var(--success)', fontWeight: 600, marginLeft: 'auto', fontSize: '0.75rem' }}>₹{tutor.hourly_rate}/hr</span>}
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {studentLocation && (
                          <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.65rem', padding: '0.3rem' }}
                            onClick={e => { e.stopPropagation(); setSelectedTutor(tutor); drawRoute(tutor); }}>
                            <i className="fas fa-route"></i> Route
                          </button>
                        )}
                        <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: '0.65rem', padding: '0.3rem' }}
                          onClick={e => { e.stopPropagation(); setBookingTutor(tutor); }}>
                          <i className="fas fa-calendar-plus"></i> Book
                        </button>
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.65rem', padding: '0.3rem' }}
                          onClick={e => { e.stopPropagation(); navigate(`/messages?to=${tutor.email}`); }}>
                          <i className="fas fa-comment"></i> Msg
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {tutorsOffMap.length > 0 && (
              <div style={{ marginTop: '0.75rem', padding: '0.6rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', color: 'var(--warning)' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.4rem' }}></i>
                {tutorsOffMap.length} tutor{tutorsOffMap.length > 1 ? 's' : ''} not shown (no location)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Booking Modal — Pre-filled from DB */}
      {bookingTutor && (
        <div className="modal-overlay" onClick={() => setBookingTutor(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Book Demo — {bookingTutor.name}</h2>
              <button className="modal-close" onClick={() => setBookingTutor(null)}><i className="fas fa-times"></i></button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {bookingTutor.type} Tutor • {bookingTutor.subject || 'General'}
              {bookingTutor.distance_km && ` • ${bookingTutor.distance_km} km away`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label>Phone Number <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>(from your profile)</span></label>
                <input type="tel" value={bookForm.phone} onChange={e => setBookForm({...bookForm, phone: e.target.value})} placeholder="+91 98765 43210" style={{ background: bookForm.phone ? 'var(--success-bg)' : undefined }} />
              </div>
              <div>
                <label>Subject <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>(tutor's subject)</span></label>
                <input type="text" value={bookForm.subject} onChange={e => setBookForm({...bookForm, subject: e.target.value})} placeholder={bookingTutor.subject || 'e.g. Mathematics'} style={{ background: bookForm.subject ? 'var(--success-bg)' : undefined }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Budget (₹) <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>*</span></label>
                  <input type="number" value={bookForm.budget} onChange={e => setBookForm({...bookForm, budget: e.target.value})} placeholder="e.g. 5000" required autoFocus />
                </div>
                <div>
                  <label>Preferred Timings <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>*</span></label>
                  <input type="text" value={bookForm.timings} onChange={e => setBookForm({...bookForm, timings: e.target.value})} placeholder="e.g. 4-6 PM" required />
                </div>
              </div>
              <button className="btn btn-primary" style={{ marginTop: '0.5rem' }} onClick={handleBookDemo} disabled={bookingLoading || !bookForm.phone || !bookForm.timings}>
                {bookingLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane"></i> Send Demo Request</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TutorMap;
