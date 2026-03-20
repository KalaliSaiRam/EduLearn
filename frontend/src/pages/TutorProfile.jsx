import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import './Profile.css';
import API_BASE from '../config';

const TutorProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});
  const [geocoding, setGeocoding] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const fetchProfile = async () => {
    try {
      if (!token) { navigate('/login'); return; }
      const res = await fetch(`${API_BASE}/api/profile/tutor`, {
        headers: { 'x-auth-token': token }
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProfile(data);
      setForm({
        phone: data.phone || '',
        address: data.address || '',
        pincode: data.pincode || '',
        bio: data.bio || '',
        subject: data.subject || '',
        hourly_rate: data.hourly_rate || '',
        experience_years: data.experience_years || ''
      });
    } catch (err) { setError('Error fetching profile'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.hourly_rate) payload.hourly_rate = parseFloat(payload.hourly_rate);
      if (payload.experience_years) payload.experience_years = parseInt(payload.experience_years);

      const res = await fetch(`${API_BASE}/api/profile/tutor`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        if (form.address !== profile.address || form.pincode !== profile.pincode) {
          setGeocoding(true);
          try {
            await fetch(`${API_BASE}/api/geocode/update-my-location`, {
              method: 'POST', headers: { 'Content-Type': 'application/json', 'x-auth-token': token }
            });
          } catch (e) { /* non-blocking */ }
          setGeocoding(false);
        }
        await fetchProfile();
        setEditing(false);
      }
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleCancel = () => {
    setForm({
      phone: profile.phone || '',
      address: profile.address || '',
      pincode: profile.pincode || '',
      bio: profile.bio || '',
      subject: profile.subject || '',
      hourly_rate: profile.hourly_rate || '',
      experience_years: profile.experience_years || ''
    });
    setEditing(false);
  };

  const renderStars = (rating) => [1,2,3,4,5].map(i => (
    <i key={i} className="fas fa-star" style={{ color: i <= Math.round(rating || 0) ? '#fbbf24' : 'var(--text-light)', fontSize: '1rem' }}></i>
  ));

  if (loading) return (
    <Layout type="teacher">
      <div className="profile-container animate-fade-in">
        <div className="skeleton" style={{ height: 150, borderRadius: 'var(--radius-lg)' }}></div>
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)', marginTop: '1rem' }}></div>
      </div>
    </Layout>
  );

  return (
    <Layout type="teacher">
      <div className="profile-container animate-fade-in">
        {error ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
            <p>{error}</p>
          </div>
        ) : profile ? (
          <div className="profile-card">
            {/* Cover + Avatar */}
            <div className="profile-cover">
              <div className="profile-avatar-container">
                <div className="profile-avatar">
                  {profile.name?.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="profile-actions">
                {!editing ? (
                  <button className="btn btn-primary btn-sm profile-edit-btn" onClick={() => setEditing(true)}>
                    <i className="fas fa-pen"></i> Edit Profile
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleCancel}><i className="fas fa-times"></i> Cancel</button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                      {saving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check"></i> Save</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-body">
              <div className="profile-header-main">
                <h2 className="profile-name">{profile.name}</h2>
                <span className="badge badge-primary">{profile.type}</span>
              </div>
              <div className="profile-role">
                <i className="fas fa-chalkboard-teacher"></i> {profile.subject || 'Tutor'}
                {profile.rating > 0 && (
                  <div className="rating-stars">
                    {renderStars(profile.rating)}
                    <span className="rating-count">({profile.total_reviews || 0})</span>
                  </div>
                )}
              </div>

              {/* Stats Row */}
              <div className="profile-stats-grid" style={{ marginBottom: '2rem' }}>
                <div className="profile-stat-card">
                  <i className="fas fa-star" style={{ color: '#fbbf24' }}></i>
                  <span className="stat-value">{profile.rating ? parseFloat(profile.rating).toFixed(1) : '0.0'}</span>
                  <span className="stat-label">Rating</span>
                </div>
                <div className="profile-stat-card">
                  <i className="fas fa-comments" style={{ color: 'var(--primary)' }}></i>
                  <span className="stat-value">{profile.total_reviews || 0}</span>
                  <span className="stat-label">Reviews</span>
                </div>
                <div className="profile-stat-card">
                  <i className="fas fa-briefcase" style={{ color: 'var(--info)' }}></i>
                  <span className="stat-value">{profile.experience_years || 0}</span>
                  <span className="stat-label">Yrs Exp</span>
                </div>
                <div className="profile-stat-card">
                  <i className="fas fa-rupee-sign" style={{ color: 'var(--success)' }}></i>
                  <span className="stat-value">{profile.hourly_rate || '—'}</span>
                  <span className="stat-label">₹/Hour</span>
                </div>
              </div>

              {/* Bio */}
              <div className="info-section">
                <h3 className="info-section-title"><i className="fas fa-quote-left"></i> About Me</h3>
                {editing ? (
                  <textarea rows={3} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                    placeholder="Tell students about your teaching style, experience, and qualifications..." className="profile-edit-input" />
                ) : (
                  <p className={`profile-bio-text ${!profile.bio ? 'empty' : ''}`}>
                    {profile.bio || 'No bio yet. Click "Edit Profile" to add one!'}
                  </p>
                )}
              </div>

              {/* Professional Details */}
              <div className="info-section">
                <h3 className="info-section-title"><i className="fas fa-briefcase"></i> Professional Details</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Subject</span>
                    {editing ? (
                      <input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="profile-edit-input" />
                    ) : (
                      <span className="info-value"><i className="fas fa-book" style={{ marginRight: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem' }}></i>{profile.subject || '—'}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <span className="info-label">Tutor Type</span>
                    <span className="info-value">
                      <span className="badge badge-primary">{profile.type}</span>
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Hourly Rate (₹)</span>
                    {editing ? (
                      <input type="number" value={form.hourly_rate} onChange={e => setForm({...form, hourly_rate: e.target.value})} placeholder="e.g. 500" className="profile-edit-input" />
                    ) : (
                      <span className="info-value"><i className="fas fa-rupee-sign" style={{ marginRight: '0.5rem', color: 'var(--success)', fontSize: '0.85rem' }}></i>{profile.hourly_rate ? `₹${profile.hourly_rate}` : '—'}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <span className="info-label">Experience (Years)</span>
                    {editing ? (
                      <input type="number" value={form.experience_years} onChange={e => setForm({...form, experience_years: e.target.value})} placeholder="e.g. 3" className="profile-edit-input" />
                    ) : (
                      <span className="info-value"><i className="fas fa-calendar-alt" style={{ marginRight: '0.5rem', color: 'var(--info)', fontSize: '0.85rem' }}></i>{profile.experience_years ? `${profile.experience_years} years` : '—'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="info-section">
                <h3 className="info-section-title"><i className="fas fa-address-card"></i> Contact</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Email</span>
                    <span className="info-value"><i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem' }}></i>{profile.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone</span>
                    {editing ? (
                      <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="profile-edit-input" />
                    ) : (
                      <span className="info-value"><i className="fas fa-phone" style={{ marginRight: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem' }}></i>{profile.phone || '—'}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <span className="info-label">Gender</span>
                    <span className="info-value"><i className="fas fa-venus-mars" style={{ marginRight: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem' }}></i>{profile.gender || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="info-section">
                <h3 className="info-section-title"><i className="fas fa-map-marker-alt"></i> Location</h3>
                <div className="info-grid">
                  <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="info-label">Address</span>
                    {editing ? (
                      <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Your full address" className="profile-edit-input" />
                    ) : (
                      <span className="info-value">{profile.address || '—'}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <span className="info-label">Pincode</span>
                    {editing ? (
                      <input type="text" value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} placeholder="Pincode" className="profile-edit-input" />
                    ) : (
                      <span className="info-value">{profile.pincode || '—'}</span>
                    )}
                  </div>
                </div>
                {geocoding && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--primary)' }}>
                    <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.4rem' }}></i> Updating your map location...
                  </div>
                )}
                {profile.latitude && profile.longitude && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--success)' }}>
                    <i className="fas fa-check-circle" style={{ marginRight: '0.4rem' }}></i> Map location set ({parseFloat(profile.latitude).toFixed(4)}, {parseFloat(profile.longitude).toFixed(4)})
                  </div>
                )}
              </div>

              {/* Verified Banner */}
              <div className="assigned-tutor-banner verified">
                <div className="tutor-banner-icon"><i className="fas fa-shield-alt"></i></div>
                <div className="tutor-banner-content">
                  <h4>Verified {profile.type} Tutor</h4>
                  <p>Your profile is visible to students searching for tutors in your area.</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}><p>Profile not found.</p></div>
        )}
      </div>
    </Layout>
  );
};

export default TutorProfile;
