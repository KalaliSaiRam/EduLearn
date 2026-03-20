import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import API_BASE from '../config';

const Assignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [submitting, setSubmitting] = useState(null);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const isTutor = user.role === 'teacher';

  useEffect(() => { fetchAssignments(); }, []);

  // Auto-fetch tutor's subject for pre-fill
  useEffect(() => {
    if (isTutor) {
      const fetchSubject = async () => {
        try {
          const res = await fetch(`${API_BASE}/api/profile/tutor`, { headers: { 'x-auth-token': token } });
          const data = await res.json();
          if (data.subject) setNewAssignment(prev => ({ ...prev, subject: data.subject }));
        } catch (err) { console.error(err); }
      };
      fetchSubject();
    }
  }, [isTutor, token]);

  const fetchAssignments = async () => {
    try {
      const endpoint = isTutor ? '/api/assignments/tutor' : '/api/assignments/student';
      const res = await fetch(`${API_BASE}${endpoint}`, { headers: { 'x-auth-token': token } });
      const data = await res.json();
      setAssignments(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // Student submit
  const handleSubmit = async (assignmentId, file) => {
    if (!file) return;
    setSubmitting(assignmentId);
    const formData = new FormData();
    formData.append('submission', file);
    try {
      await fetch(`${API_BASE}/api/assignments/${assignmentId}/submit`, {
        method: 'POST',
        headers: { 'x-auth-token': token },
        body: formData
      });
      fetchAssignments();
    } catch (err) { console.error(err); }
    finally { setSubmitting(null); }
  };

  // Student view
  const pendingAssignments = assignments.filter(a => !a.submission_id);
  const submittedAssignments = assignments.filter(a => a.submission_id && !a.my_marks);
  const gradedAssignments = assignments.filter(a => a.my_marks !== null && a.my_marks !== undefined);

  // Tutor view
  const [showCreate, setShowCreate] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', subject: '', due_date: '', max_marks: 100 });
  const [createFile, setCreateFile] = useState(null);
  const [creating, setCreating] = useState(false);

  const createAssignment = async () => {
    if (!newAssignment.title) return;
    setCreating(true);
    const formData = new FormData();
    Object.entries(newAssignment).forEach(([k, v]) => formData.append(k, v));
    if (createFile) formData.append('attachment', createFile);
    try {
      await fetch(`${API_BASE}/api/assignments`, {
        method: 'POST',
        headers: { 'x-auth-token': token },
        body: formData
      });
      setShowCreate(false);
      setNewAssignment({ title: '', description: '', subject: '', due_date: '', max_marks: 100 });
      setCreateFile(null);
      fetchAssignments();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const getDueStatus = (due) => {
    if (!due) return null;
    const d = new Date(due);
    const now = new Date();
    const diff = d - now;
    if (diff < 0) return { text: 'Overdue', class: 'badge-danger' };
    if (diff < 86400000 * 2) return { text: 'Due Soon', class: 'badge-warning' };
    return { text: new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), class: 'badge-info' };
  };

  // Student UI
  if (!isTutor) {
    const currentData = activeTab === 'pending' ? pendingAssignments : activeTab === 'submitted' ? submittedAssignments : gradedAssignments;
    return (
      <Layout type="student">
        <div className="animate-fade-in">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
            <i className="fas fa-tasks text-primary" style={{ marginRight: '0.75rem' }}></i>My Assignments
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Complete and track your homework</p>

          <div className="tabs" style={{ maxWidth: '480px' }}>
            <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Pending ({pendingAssignments.length})</button>
            <button className={`tab ${activeTab === 'submitted' ? 'active' : ''}`} onClick={() => setActiveTab('submitted')}>Submitted ({submittedAssignments.length})</button>
            <button className={`tab ${activeTab === 'graded' ? 'active' : ''}`} onClick={() => setActiveTab('graded')}>Graded ({gradedAssignments.length})</button>
          </div>

          {loading ? (
            <div style={{ display: 'grid', gap: '1rem' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{height: '100px'}}></div>)}</div>
          ) : currentData.length === 0 ? (
            <div className="card"><div className="empty-state">
              <i className="fas fa-clipboard-list empty-state-icon"></i>
              <h3>No {activeTab} assignments</h3>
            </div></div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {currentData.map(a => (
                <div key={a.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{a.title}</h3>
                        {a.subject && <span className="badge badge-primary">{a.subject}</span>}
                        {getDueStatus(a.due_date) && <span className={`badge ${getDueStatus(a.due_date).class}`}>{getDueStatus(a.due_date).text}</span>}
                      </div>
                      {a.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{a.description}</p>}
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-light)', flexWrap: 'wrap' }}>
                        <span><i className="fas fa-user-tie" style={{marginRight: '0.35rem'}}></i>{a.teacher_name}</span>
                        <span><i className="fas fa-star" style={{marginRight: '0.35rem'}}></i>Max: {a.max_marks}</span>
                        {a.my_marks !== null && a.my_marks !== undefined && (
                          <span style={{color: 'var(--success)', fontWeight: 600}}>
                            <i className="fas fa-check-circle" style={{marginRight: '0.35rem'}}></i>Score: {a.my_marks}/{a.max_marks}
                          </span>
                        )}
                      </div>
                      {a.my_feedback && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                          <strong style={{color: 'var(--primary)'}}>Feedback:</strong> {a.my_feedback}
                        </div>
                      )}
                    </div>
                    {activeTab === 'pending' && (
                      <div style={{ flexShrink: 0 }}>
                        <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                          {submitting === a.id ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-upload"></i> Submit</>}
                          <input type="file" style={{ display: 'none' }} onChange={e => handleSubmit(a.id, e.target.files[0])} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Tutor UI
  return (
    <Layout type="teacher">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              <i className="fas fa-tasks text-primary" style={{ marginRight: '0.75rem' }}></i>Manage Assignments
            </h1>
            <p style={{ color: 'var(--text-muted)' }}>Create and grade student assignments</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <i className="fas fa-plus"></i> New Assignment
          </button>
        </div>

        {/* Create Modal */}
        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create Assignment</h2>
                <button className="modal-close" onClick={() => setShowCreate(false)}><i className="fas fa-times"></i></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label>Title *</label>
                  <input value={newAssignment.title} onChange={e => setNewAssignment({...newAssignment, title: e.target.value})} placeholder="Assignment title" />
                </div>
                <div>
                  <label>Description</label>
                  <textarea rows={3} value={newAssignment.description} onChange={e => setNewAssignment({...newAssignment, description: e.target.value})} placeholder="Instructions for students..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label>Subject <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>(from your profile)</span></label>
                    <input value={newAssignment.subject} onChange={e => setNewAssignment({...newAssignment, subject: e.target.value})} placeholder="e.g. Mathematics" style={{ background: newAssignment.subject ? 'var(--success-bg)' : undefined }} />
                  </div>
                  <div>
                    <label>Due Date</label>
                    <input type="date" value={newAssignment.due_date} onChange={e => setNewAssignment({...newAssignment, due_date: e.target.value})} />
                  </div>
                </div>
                <div>
                  <label>Max Marks</label>
                  <input type="number" value={newAssignment.max_marks} onChange={e => setNewAssignment({...newAssignment, max_marks: e.target.value})} />
                </div>
                <div>
                  <label>Attachment (optional)</label>
                  <input type="file" onChange={e => setCreateFile(e.target.files[0])} />
                </div>
                <button className="btn btn-primary w-100" onClick={createAssignment} disabled={creating}>
                  {creating ? <i className="fas fa-spinner fa-spin"></i> : 'Create Assignment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gap: '1rem' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{height: '100px'}}></div>)}</div>
        ) : assignments.length === 0 ? (
          <div className="card"><div className="empty-state">
            <i className="fas fa-clipboard-list empty-state-icon"></i>
            <h3>No assignments yet</h3>
            <p>Create your first assignment</p>
          </div></div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {assignments.map(a => (
              <div key={a.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{a.title}</h3>
                    {a.subject && <span className="badge badge-primary" style={{marginTop: '0.25rem'}}>{a.subject}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span><i className="fas fa-users" style={{marginRight: '0.35rem'}}></i>{a.submissions_count || 0} submissions</span>
                    <span><i className="fas fa-check-circle" style={{marginRight: '0.35rem', color: 'var(--success)'}}></i>{a.graded_count || 0} graded</span>
                    {a.due_date && <span><i className="fas fa-calendar" style={{marginRight: '0.35rem'}}></i>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                  </div>
                </div>
                {a.description && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{a.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                  <div className="progress-bar-container" style={{ flex: 1, marginRight: '1rem' }}>
                    <div className="progress-bar-fill" style={{ width: `${a.submissions_count > 0 ? (a.graded_count / a.submissions_count * 100) : 0}%` }}></div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    {a.submissions_count > 0 ? Math.round((a.graded_count / a.submissions_count) * 100) : 0}% graded
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Assignments;
