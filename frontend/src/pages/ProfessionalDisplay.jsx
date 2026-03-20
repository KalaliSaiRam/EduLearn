import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import './TutorDisplay.css';
import API_BASE from '../config';

const ProfessionalDisplay = () => {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [formData, setFormData] = useState({
    studentPhone: '',
    studentSubject: '',
    studentBudget: '',
    studentTimings: '',
    requiredTutorType: 'Professional'
  });
  const [submitting, setSubmitting] = useState(false);
  
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const studentName = user.name || 'Student';
  const studentEmail = user.email || '';

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE}/api/student/tutors?type=Professional`, {
        headers: { 'x-auth-token': token }
      });
      setTutors(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to load professional tutors.');
    } finally {
      setLoading(false);
    }
  };

  const handleShow = (tutor) => {
    setSelectedTutor(tutor);
    setFormData(prev => ({ ...prev, studentSubject: tutor.subject }));
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedTutor(null);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitDemo = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_BASE}/api/student/book-demo`, {
        ...formData,
        tutorEmail: selectedTutor.email
      }, {
        headers: { 'x-auth-token': token }
      });
      alert('Demo request submitted and notification sent to the tutor!');
      handleClose();
    } catch (err) {
      console.error(err);
      alert('Failed to submit demo request.');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <Layout type="student">
      <div className="tutor-display-header">
        <h1 className="tutor-display-title text-primary">Professional Instructors</h1>
        <p className="text-muted mt-2">Certified educators with extensive teaching experience.</p>
      </div>

      <div className="tutors-container">
        {loading ? (
          <div className="text-center mt-4">
            <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
            <p className="mt-2 text-muted">Loading professional instructors...</p>
          </div>
        ) : error ? (
          <div className="auth-alert auth-alert-danger text-center">
            <i className="fas fa-exclamation-circle"></i> {error}
          </div>
        ) : tutors.length === 0 ? (
          <div className="text-center p-5 bg-card rounded border">
             <i className="fas fa-users-slash fa-3x text-light mb-3"></i>
             <h4 className="text-muted fw-bold">No Instructors Available</h4>
             <p className="text-light">Please check back later.</p>
          </div>
        ) : (
          <div className="tutor-grid">
            {tutors.map(tutor => (
              <div key={tutor.id} className="tutor-profile-card">
                <div className="tutor-profile-header professional-header">
                  <div className="tutor-avatar">
                    {getInitials(tutor.name)}
                  </div>
                </div>
                <div className="tutor-profile-body">
                  <h3 className="tutor-name">{tutor.name}</h3>
                  <span className="tutor-subject">{tutor.subject}</span>
                  
                  <div className="tutor-details">
                    <div className="detail-item">
                      <i className="fas fa-envelope"></i>
                      <span>{tutor.email}</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-phone-alt"></i>
                      <span>{tutor.phone}</span>
                    </div>
                    <div className="detail-item">
                      <i className="fas fa-map-marker-alt"></i>
                      <span>{tutor.address}</span>
                    </div>
                  </div>
                  
                  <button 
                    className="btn btn-primary req-demo-btn" 
                    onClick={() => handleShow(tutor)}
                  >
                    Request Demo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Request Demo Class</h3>
              <button className="close-modal-btn" onClick={handleClose}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            
            <div className="modal-body">
              <form onSubmit={handleSubmitDemo}>
                <div className="form-group">
                  <label>Student Name</label>
                  <input type="text" value={studentName} readOnly style={{ backgroundColor: 'var(--bg-main)' }} />
                </div>
                <div className="form-group">
                  <label>Student Email</label>
                  <input type="email" value={studentEmail} readOnly style={{ backgroundColor: 'var(--bg-main)' }} />
                </div>
                
                <div className="form-group">
                  <label>Student Phone <span className="text-danger">*</span></label>
                  <input type="tel" name="studentPhone" value={formData.studentPhone} onChange={handleInputChange} required placeholder="Enter your best contact number" />
                </div>
                
                <div className="form-group">
                  <label>Subject <span className="text-danger">*</span></label>
                  <input type="text" name="studentSubject" value={formData.studentSubject} onChange={handleInputChange} required />
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Budget (per month) <span className="text-danger">*</span></label>
                    <input type="number" name="studentBudget" value={formData.studentBudget} onChange={handleInputChange} required placeholder="e.g. 5000" />
                  </div>
                  <div className="form-group">
                    <label>Preferred Timings <span className="text-danger">*</span></label>
                    <input type="time" name="studentTimings" value={formData.studentTimings} onChange={handleInputChange} required />
                  </div>
                </div>

                {selectedTutor && (
                  <div className="tutor-info-alert">
                    <i className="fas fa-info-circle"></i> Requesting a <strong>Professional</strong> tutor session with <strong>{selectedTutor.name}</strong>.
                  </div>
                )}
                
                <button type="submit" className="btn btn-primary w-100 mt-2" disabled={submitting}>
                  {submitting ? <><i className="fas fa-spinner fa-spin"></i> Submitting...</> : 'Submit Request'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProfessionalDisplay;
