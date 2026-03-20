import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import 'leaflet/dist/leaflet.css';

const StudentMap = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [tutorLocation, setTutorLocation] = useState(null);
  const [geocoding, setGeocoding] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/profile/tutor', { headers: { 'x-auth-token': token } });
        const data = await res.json();
        if (data.latitude && data.longitude) setTutorLocation({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
      } catch (err) { console.error(err); }
    };
    fetchProfile();
  }, [token]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/tutor/mystudents-with-location', { headers: { 'x-auth-token': token } });
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchStudents();
  }, [token]);

  const calcDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
  };

  // OSRM driving route
  const drawRoute = async (student) => {
    if (!tutorLocation || !student.latitude || !student.longitude || !mapInstanceRef.current) return;
    const L = (await import('leaflet')).default;

    if (routeLayerRef.current) { mapInstanceRef.current.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${tutorLocation.lng},${tutorLocation.lat};${student.longitude},${student.latitude}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        const routeLine = L.polyline(coords, { color: '#3b82f6', weight: 5, opacity: 0.8, dashArray: '10, 6', lineCap: 'round' }).addTo(mapInstanceRef.current);
        routeLayerRef.current = routeLine;
        setRouteInfo({ distance: (route.distance / 1000).toFixed(1), duration: Math.round(route.duration / 60), studentName: student.username || student.name });
        mapInstanceRef.current.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
      }
    } catch (err) { console.error('Routing error:', err); }
  };

  const clearRoute = () => {
    if (routeLayerRef.current && mapInstanceRef.current) { mapInstanceRef.current.removeLayer(routeLayerRef.current); routeLayerRef.current = null; }
    setRouteInfo(null);
    setSelectedStudent(null);
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

      const center = tutorLocation ? [tutorLocation.lat, tutorLocation.lng] : [17.385, 78.4867];
      const map = L.map(mapRef.current).setView(center, 12);
      mapInstanceRef.current = map;
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map);

      const allPoints = [];

      if (tutorLocation) {
        const tutorIcon = L.divIcon({
          html: '<div style="background:#7c3aed;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;border:3px solid white;box-shadow:0 3px 12px rgba(124,58,237,0.4)"><i class="fas fa-chalkboard-teacher"></i></div>',
          className: '', iconSize: [36, 36], iconAnchor: [18, 18]
        });
        L.marker([tutorLocation.lat, tutorLocation.lng], { icon: tutorIcon }).addTo(map)
          .bindPopup('<div style="font-family:Inter,sans-serif;text-align:center;padding:4px"><b>🏠 Your Location</b></div>');
        allPoints.push([tutorLocation.lat, tutorLocation.lng]);
      }

      students.filter(s => s.latitude && s.longitude).forEach(student => {
        const dist = tutorLocation ? calcDistance(tutorLocation.lat, tutorLocation.lng, student.latitude, student.longitude) : null;
        const studentIcon = L.divIcon({
          html: '<div style="background:#3b82f6;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;box-shadow:0 3px 10px rgba(59,130,246,0.4)"><i class="fas fa-user-graduate"></i></div>',
          className: '', iconSize: [30, 30], iconAnchor: [15, 15]
        });

        L.marker([student.latitude, student.longitude], { icon: studentIcon }).addTo(map)
          .bindPopup(`
            <div style="font-family:Inter,sans-serif;min-width:200px;padding:4px 0">
              <h3 style="margin:0 0 3px;font-size:13px;font-weight:700">${student.username || student.name}</h3>
              <p style="margin:0 0 4px;font-size:11px;color:#888">${student.subject || 'Student'} • ${student.city || ''}</p>
              ${dist ? `<p style="font-size:12px;margin:0 0 6px;color:#3b82f6;font-weight:600">📏 ${dist} km away</p>` : ''}
              <div style="display:flex;gap:5px">
                <button onclick="window.__showStudentRoute('${student.email}')" style="flex:1;padding:5px 8px;font-size:11px;font-weight:600;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer">🧭 Directions</button>
                <button onclick="window.__msgStudent('${student.email}')" style="flex:1;padding:5px 8px;font-size:11px;font-weight:600;background:#10b981;color:white;border:none;border-radius:6px;cursor:pointer">💬 Message</button>
              </div>
            </div>
          `)
          .on('click', () => setSelectedStudent(student));
        allPoints.push([student.latitude, student.longitude]);
      });

      if (allPoints.length > 1) map.fitBounds(allPoints, { padding: [50, 50] });
    };

    if (mapRef.current && !loading) initMap();
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; } };
  }, [students, tutorLocation, loading]);

  useEffect(() => {
    window.__msgStudent = (email) => navigate(`/messages?to=${email}`);
    window.__showStudentRoute = (email) => {
      const student = students.find(s => s.email === email);
      if (student) { setSelectedStudent(student); drawRoute(student); }
    };
    return () => { delete window.__msgStudent; delete window.__showStudentRoute; };
  }, [navigate, students, tutorLocation]);

  const handleGeocodeMyLocation = async () => {
    setGeocoding(true);
    try {
      const res = await fetch('http://localhost:5000/api/geocode/update-my-location', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }
      });
      const data = await res.json();
      if (data.success) { setTutorLocation({ lat: data.latitude, lng: data.longitude }); alert(`✅ Location updated!\n${data.display_name}`); }
    } catch (err) { alert('Failed to geocode'); }
    finally { setGeocoding(false); }
  };

  const studentsOnMap = students.filter(s => s.latitude && s.longitude);

  return (
    <Layout type="teacher">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.2rem' }}>
              <i className="fas fa-map-marked-alt text-primary" style={{ marginRight: '0.75rem' }}></i>Student Map
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <strong>{studentsOnMap.length}</strong> students on map
              {tutorLocation ? <span> • <span style={{color:'var(--success)'}}>📍 Location set</span></span> : <span> • <span style={{color:'var(--warning)'}}>⚠ Not set</span></span>}
            </p>
          </div>
          {!tutorLocation && (
            <button className="btn btn-secondary btn-sm" onClick={handleGeocodeMyLocation} disabled={geocoding}>
              <i className={`fas ${geocoding ? 'fa-spinner fa-spin' : 'fa-crosshairs'}`}></i>
              {geocoding ? 'Finding...' : 'Set My Location'}
            </button>
          )}
        </div>

        {/* Route Info Banner */}
        {routeInfo && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(124,58,237,0.1) 100%)',
            border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                <i className="fas fa-route" style={{ color: '#3b82f6', marginRight: '0.4rem' }}></i>
                Route to <strong>{routeInfo.studentName}</strong>
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--info)', fontWeight: 600 }}>
                <i className="fas fa-road" style={{ marginRight: '0.3rem' }}></i>{routeInfo.distance} km
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: 600 }}>
                <i className="fas fa-clock" style={{ marginRight: '0.3rem' }}></i>~{routeInfo.duration} min drive
              </span>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={clearRoute} style={{ fontSize: '0.75rem' }}>
              <i className="fas fa-times"></i> Clear
            </button>
          </div>
        )}

        {/* Legend */}
        <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#7c3aed', marginRight: 5, verticalAlign: 'middle' }}></span>You (Tutor)</span>
          <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', marginRight: 5, verticalAlign: 'middle' }}></span>Student</span>
          {routeInfo && <span><span style={{ display: 'inline-block', width: 14, height: 3, background: '#3b82f6', marginRight: 5, verticalAlign: 'middle', borderRadius: 2 }}></span>Route</span>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem' }}>
          <div ref={mapRef} style={{ height: '520px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--bg-card)' }}></div>

          <div className="card" style={{ maxHeight: '520px', overflowY: 'auto', padding: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>My Students ({students.length})</h3>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '70px' }}></div>)}
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state"><i className="fas fa-users empty-state-icon"></i><h3>No students yet</h3><p>Accept demo requests to see students here.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {students.map((student, idx) => {
                  const dist = (tutorLocation && student.latitude && student.longitude)
                    ? calcDistance(tutorLocation.lat, tutorLocation.lng, student.latitude, student.longitude) : null;
                  return (
                    <div key={idx}
                      onClick={() => {
                        setSelectedStudent(student);
                        if (mapInstanceRef.current && student.latitude && student.longitude) mapInstanceRef.current.setView([student.latitude, student.longitude], 15);
                      }}
                      style={{
                        padding: '0.75rem', border: `1.5px solid ${selectedStudent?.email === student.email ? 'var(--primary)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        background: selectedStudent?.email === student.email ? 'var(--primary-light)' : 'var(--bg-input)', transition: 'var(--transition-fast)'
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{student.username || student.name}</span>
                        {dist && <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 600 }}>📏 {dist} km</span>}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.3rem' }}>
                        {student.subject || 'Student'} {student.city ? `• ${student.city}` : ''}
                      </p>
                      {!student.latitude && <span style={{ fontSize: '0.65rem', color: 'var(--warning)' }}><i className="fas fa-exclamation-triangle"></i> No location</span>}
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.4rem' }}>
                        {tutorLocation && student.latitude && (
                          <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.65rem', padding: '0.3rem' }}
                            onClick={e => { e.stopPropagation(); setSelectedStudent(student); drawRoute(student); }}>
                            <i className="fas fa-route"></i> Route
                          </button>
                        )}
                        <button className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.65rem', padding: '0.3rem' }}
                          onClick={e => { e.stopPropagation(); navigate(`/messages?to=${student.email}`); }}>
                          <i className="fas fa-comment"></i> Message
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudentMap;
