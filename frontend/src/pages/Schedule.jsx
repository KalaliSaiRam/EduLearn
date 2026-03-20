import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import API_BASE from '../config';

const Schedule = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showCreate, setShowCreate] = useState(false);
  const [students, setStudents] = useState([]);
  const [createForm, setCreateForm] = useState({
    student_email: '', session_date: '', start_time: '', end_time: '', subject: '', topic: '', notes: ''
  });
  const [creating, setCreating] = useState(false);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const isTutor = user.role === 'teacher';

  useEffect(() => { fetchSessions(); }, []);

  useEffect(() => {
    if (isTutor) {
      // Fetch accepted students for the create form
      const fetchStudents = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/tutor/mystudents-with-location`, {
            headers: { 'x-auth-token': token }
          });
          const data = await res.json();
          setStudents(Array.isArray(data) ? data : []);
        } catch (err) { console.error(err); }
      };
      fetchStudents();
    }
  }, [isTutor, token]);

  // Auto-fetch tutor's subject for pre-fill
  useEffect(() => {
    if (isTutor) {
      const fetchSubject = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/profile/tutor`, { headers: { 'x-auth-token': token } });
          const data = await res.json();
          if (data.subject) setCreateForm(prev => ({ ...prev, subject: data.subject }));
        } catch (err) { console.error(err); }
      };
      fetchSubject();
    }
  }, [isTutor, token]);

  const fetchSessions = async () => {
    try {
      const endpoint = isTutor ? '/api/schedule/tutor' : '/api/schedule/student';
      const res = await fetch(`${API_BASE}${endpoint}`, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch(`${API_BASE}/api/schedule/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ status })
      });
      fetchSessions();
    } catch (err) { console.error(err); }
  };

  const handleCreate = async () => {
    if (!createForm.student_email || !createForm.session_date || !createForm.start_time || !createForm.end_time) {
      alert('Please fill all required fields.');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE}/api/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(createForm)
      });
      const data = await res.json();
      if (data.success) {
        alert('✅ Session scheduled!');
        setShowCreate(false);
        setCreateForm({ student_email: '', session_date: '', start_time: '', end_time: '', subject: '', topic: '', notes: '' });
        fetchSessions();
      } else {
        alert(data.error || 'Failed to schedule');
      }
    } catch (err) { alert('Server error'); }
    finally { setCreating(false); }
  };

  const now = new Date();
  const today = new Date(now.toDateString());
  const upcoming = sessions.filter(s => new Date(s.session_date) >= today && s.status === 'scheduled');
  const completed = sessions.filter(s => s.status === 'completed');
  const cancelled = sessions.filter(s => s.status === 'cancelled');
  const currentList = activeTab === 'upcoming' ? upcoming : activeTab === 'completed' ? completed : cancelled;

  const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formatDateFull = (date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const getStatusStyle = (status) => {
    const map = {
      'scheduled': { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', icon: 'fa-clock' },
      'in-progress': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', icon: 'fa-play-circle' },
      'completed': { bg: 'rgba(16,185,129,0.1)', color: '#10b981', icon: 'fa-check-circle' },
      'cancelled': { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', icon: 'fa-times-circle' }
    };
    return map[status] || map['scheduled'];
  };

  // Group upcoming by date
  const groupedUpcoming = upcoming.reduce((acc, s) => {
    const dateKey = new Date(s.session_date).toDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(s);
    return acc;
  }, {});

  return (
    <Layout type={isTutor ? 'teacher' : 'student'}>
      <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.2rem' }}>
              <i className="fas fa-calendar-alt text-primary" style={{ marginRight: '0.75rem' }}></i>
              {isTutor ? 'My Schedule' : 'My Sessions'}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {isTutor ? 'Manage and create teaching sessions' : 'View your scheduled sessions'}
            </p>
          </div>
          {isTutor && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
              <i className="fas fa-plus"></i> Schedule Session
            </button>
          )}
        </div>

        {/* Quick Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #3b82f6', cursor: 'pointer', background: activeTab === 'upcoming' ? 'rgba(59,130,246,0.05)' : undefined }}
            onClick={() => setActiveTab('upcoming')}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#3b82f6' }}>{upcoming.length}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Upcoming</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #10b981', cursor: 'pointer', background: activeTab === 'completed' ? 'rgba(16,185,129,0.05)' : undefined }}
            onClick={() => setActiveTab('completed')}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>{completed.length}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Completed</div>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center', borderTop: '3px solid #ef4444', cursor: 'pointer', background: activeTab === 'cancelled' ? 'rgba(239,68,68,0.05)' : undefined }}
            onClick={() => setActiveTab('cancelled')}>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444' }}>{cancelled.length}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Cancelled</div>
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }}></div>)}
          </div>
        ) : currentList.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <i className="fas fa-calendar-times" style={{ fontSize: '2.5rem', color: 'var(--text-light)', marginBottom: '1rem' }}></i>
            <h3>No {activeTab} sessions</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              {activeTab === 'upcoming'
                ? (isTutor ? 'Click "Schedule Session" to create one!' : 'Your tutor will schedule sessions for you.')
                : `No ${activeTab} sessions yet.`}
            </p>
          </div>
        ) : activeTab === 'upcoming' ? (
          // Grouped by date for upcoming
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {Object.entries(groupedUpcoming).map(([dateKey, dateSessions]) => (
              <div key={dateKey}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem', paddingLeft: '0.25rem' }}>
                  <i className="fas fa-calendar-day" style={{ marginRight: '0.4rem' }}></i>
                  {formatDateFull(dateKey)}
                </div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {dateSessions.map(session => renderSession(session))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {currentList.map(session => renderSession(session))}
          </div>
        )}
      </div>

      {/* Create Session Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2><i className="fas fa-calendar-plus" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>Schedule New Session</h2>
              <button className="modal-close" onClick={() => setShowCreate(false)}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>
                  Student <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select value={createForm.student_email}
                  onChange={e => setCreateForm({...createForm, student_email: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: '0.9rem' }}>
                  <option value="">Select a student...</option>
                  {students.map(s => (
                    <option key={s.email} value={s.email}>{s.username || s.name} ({s.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>
                  Date <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input type="date" value={createForm.session_date}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setCreateForm({...createForm, session_date: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>
                    Start Time <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input type="time" value={createForm.start_time}
                    onChange={e => setCreateForm({...createForm, start_time: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>
                    End Time <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <input type="time" value={createForm.end_time}
                    onChange={e => setCreateForm({...createForm, end_time: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>Subject <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>(from your profile)</span></label>
                  <input type="text" placeholder="e.g. Mathematics" value={createForm.subject}
                    onChange={e => setCreateForm({...createForm, subject: e.target.value})}
                    style={{ background: createForm.subject ? 'var(--success-bg)' : undefined }} />
                </div>
                <div>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>Topic</label>
                  <input type="text" placeholder="e.g. Quadratic Equations" value={createForm.topic}
                    onChange={e => setCreateForm({...createForm, topic: e.target.value})} />
                </div>
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'block' }}>Notes (optional)</label>
                <textarea rows={2} placeholder="Any notes for the session..."
                  value={createForm.notes} onChange={e => setCreateForm({...createForm, notes: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-main)', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <button className="btn btn-primary" onClick={handleCreate} disabled={creating} style={{ marginTop: '0.25rem' }}>
                {creating ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-calendar-check"></i> Schedule Session</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );

  function renderSession(session) {
    const ss = getStatusStyle(session.status);
    const isToday = new Date(session.session_date).toDateString() === now.toDateString();
    return (
      <div key={session.id} className="card" style={{ padding: '1rem', borderLeft: `4px solid ${ss.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ flex: 1 }}>
            {/* Status + Topic */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ background: ss.bg, color: ss.color, padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                <i className={`fas ${ss.icon}`} style={{ marginRight: '0.3rem' }}></i>{session.status}
              </span>
              {session.subject && <span style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700 }}>{session.subject}</span>}
              {isToday && <span style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', fontWeight: 700 }}>📅 Today</span>}
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="fas fa-user" style={{ color: 'var(--primary)', width: 14, fontSize: '0.8rem' }}></i>
                <span style={{ fontWeight: 500 }}>{isTutor ? session.student_name : session.teacher_name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="fas fa-calendar" style={{ color: '#3b82f6', width: 14, fontSize: '0.8rem' }}></i>
                <span>{formatDate(session.session_date)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="fas fa-clock" style={{ color: '#f59e0b', width: 14, fontSize: '0.8rem' }}></i>
                <span>{session.start_time?.slice(0, 5)} — {session.end_time?.slice(0, 5)}</span>
              </div>
              {session.topic && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <i className="fas fa-book" style={{ color: '#10b981', width: 14, fontSize: '0.8rem' }}></i>
                  <span>{session.topic}</span>
                </div>
              )}
            </div>
            {session.notes && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', fontStyle: 'italic' }}>
                <i className="fas fa-sticky-note" style={{ marginRight: '0.3rem' }}></i>{session.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          {session.status === 'scheduled' && isTutor && (
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
              <button className="btn btn-sm" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 600, fontSize: '0.75rem' }}
                onClick={() => updateStatus(session.id, 'completed')}>
                <i className="fas fa-check"></i> Complete
              </button>
              <button className="btn btn-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontWeight: 600, fontSize: '0.75rem' }}
                onClick={() => updateStatus(session.id, 'cancelled')}>
                <i className="fas fa-times"></i> Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
};

export default Schedule;
