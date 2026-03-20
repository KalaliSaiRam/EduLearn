import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import './Profile.css';

const StudentProfile = () => {
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
      const res = await fetch('http://localhost:5000/api/profile/student', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      setProfile(data);
      setForm({
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        pincode: data.pincode || '',
        bio: data.bio || ''
      });
    } catch (err) { setError('Error fetching profile'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('http://localhost:5000/api/profile/student', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        // Re-geocode if address changed
        if (form.address !== profile.address || form.city !== profile.city || form.pincode !== profile.pincode) {
          setGeocoding(true);
          try {
            await fetch('http://localhost:5000/api/geocode/update-my-location', {
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
      city: profile.city || '',
      pincode: profile.pincode || '',
      bio: profile.bio || ''
    });
    setEditing(false);
  };

  if (loading) return (
    <Layout type="student">
      <div className="profile-container animate-fade-in">
        <div className="skeleton" style={{ height: 150, borderRadius: 'var(--radius-lg)' }}></div>
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)', marginTop: '1rem' }}></div>
      </div>
    </Layout>
  );

  return (
    <Layout type="student">
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
                <div className="profile-avatar">{profile.name?.charAt(0).toUpperCase()}</div>
              </div>
              <div className="profile-actions">
                {!editing ? (
                  <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
                    <i className="fas fa-pen"></i> Edit Profile
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={handleCancel}>
                      <i className="fas fa-times"></i> Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                      {saving ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-check"></i> Save</>}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="profile-body">
              <h2 className="profile-name">{profile.name}</h2>
              <div className="profile-role">
                <i className="fas fa-book-reader"></i> Class {profile.class} Student
              </div>

              {/* Bio */}
              <div className="info-section">
                <h3 className="info-section-title"><i className="fas fa-quote-left"></i> About Me</h3>
                {editing ? (
                  <textarea rows={3} value={form.bio} onChange={e => setForm({...form, bio: e.target.value})}
                    placeholder="Tell tutors about yourself, your learning goals, and how you prefer to study..." className="profile-edit-input" />
                ) : (
                  <p style={{ color: profile.bio ? 'var(--text-main)' : 'var(--text-light)', fontStyle: profile.bio ? 'normal' : 'italic', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    {profile.bio || 'No bio added yet. Click "Edit Profile" to add one!'}
                  </p>
                )}
              </div>

              {/* Contact */}
              <div className="info-section">
                <h3 className="info-section-title"><i className="fas fa-address-card"></i> Contact Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Email Address</span>
                    <span className="info-value"><i className="fas fa-envelope" style={{ marginRight: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem' }}></i>{profile.email}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Phone Number</span>
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
                  <div className="info-item">
                    <span className="info-label">Class</span>
                    <span className="info-value"><i className="fas fa-graduation-cap" style={{ marginRight: '0.5rem', color: 'var(--primary)', fontSize: '0.85rem' }}></i>{profile.class || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="info-section">
                <h3 className="info-section-title"><i className="fas fa-map-marker-alt"></i> Location Details</h3>
                <div className="info-grid">
                  <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                    <span className="info-label">Address</span>
                    {editing ? (
                      <input type="text" value={form.address} onChange={e => setForm({...form, address: e.target.value})} placeholder="Enter your full address" className="profile-edit-input" />
                    ) : (
                      <span className="info-value">{profile.address || '—'}</span>
                    )}
                  </div>
                  <div className="info-item">
                    <span className="info-label">City</span>
                    {editing ? (
                      <input type="text" value={form.city} onChange={e => setForm({...form, city: e.target.value})} placeholder="City" className="profile-edit-input" />
                    ) : (
                      <span className="info-value">{profile.city || '—'}</span>
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

              {/* Assigned Tutor */}
              {profile.teacher_name && (
                <div className="assigned-tutor-banner">
                  <div className="tutor-banner-icon"><i className="fas fa-chalkboard-teacher"></i></div>
                  <div className="tutor-banner-content">
                    <h4>Assigned Tutor</h4>
                    <p><strong>{profile.teacher_name}</strong> ({profile.teacher_subject})</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}><i className="fas fa-envelope" style={{ marginRight: '0.35rem' }}></i>{profile.teacher_email}</p>
                  </div>
                </div>
              )}

              {/* Account Stats */}
              <div className="profile-stats-grid">
                <div className="profile-stat-card">
                  <i className="fas fa-map-pin" style={{ color: 'var(--primary)' }}></i>
                  <span className="stat-value">{profile.latitude ? 'Set' : 'Not Set'}</span>
                  <span className="stat-label">Location</span>
                </div>
                <div className="profile-stat-card">
                  <i className="fas fa-user-check" style={{ color: 'var(--success)' }}></i>
                  <span className="stat-value">{profile.teacher_name ? 'Yes' : 'No'}</span>
                  <span className="stat-label">Tutor Assigned</span>
                </div>
                <div className="profile-stat-card">
                  <i className="fas fa-shield-alt" style={{ color: 'var(--info)' }}></i>
                  <span className="stat-value">Verified</span>
                  <span className="stat-label">Account</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p>Profile not found.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentProfile;
