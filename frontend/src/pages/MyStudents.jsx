import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import './Progress.css';

const MyStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // We'll also extract tutor details from the token or local storage
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const tutorType = user.type || 'Professional'; 

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const res = await axios.get('http://localhost:5000/api/tutor/mystudents', {
          headers: { 'x-auth-token': token }
        });
        
        setStudents(res.data);
      } catch (err) {
        console.error("Error fetching students", err);
        setError('Failed to load your students.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return (
    <Layout type="teacher">
      <div className="progress-header">
        <h1 className="progress-title mb-0">
          <i className="fas fa-users text-primary"></i> Your Students
          <span 
            className="assessment-badge ml-3 align-middle" 
            style={{ 
              backgroundColor: tutorType === 'Professional' ? 'var(--primary-light)' : 'var(--warning-bg)', 
              color: tutorType === 'Professional' ? 'var(--primary)' : 'var(--warning)',
              fontSize: '0.9rem', 
              padding: '0.35rem 0.8rem', 
            }}
          >
            {tutorType} Tutor
          </span>
        </h1>
        <p className="text-muted mt-2">Manage and view details for students assigned to you.</p>
      </div>

      {loading ? (
        <div className="text-center mt-5 py-5">
          <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
          <p className="mt-3 text-muted">Loading your students...</p>
        </div>
      ) : error ? (
        <div className="auth-alert auth-alert-danger text-center mt-5 max-w-2xl mx-auto">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      ) : students.length > 0 ? (
        <div className="stat-cards-container" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))'}}>
          {students.map((student, idx) => (
            <div key={idx} className="stat-card" style={{alignItems: 'flex-start', flexDirection: 'column'}}>
              
              <div className="w-100 d-flex justify-content-between align-items-center mb-3">
                 <div className="d-flex align-items-center gap-3">
                    <div className="student-avatar" style={{width: '50px', height: '50px', fontSize: '1.5rem'}}>
                       {(student.username || student.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                       <h3 className="m-0 text-main font-weight-bold" style={{fontSize: '1.2rem'}}>
                         {student.username || student.email}
                       </h3>
                       <span className="text-primary font-weight-bold" style={{fontSize: '0.9rem'}}>
                         {student.subject}
                       </span>
                    </div>
                 </div>
              </div>

              <div className="w-100" style={{marginTop: '0.5rem'}}>
                <div className="d-flex align-items-center mb-2 text-muted" style={{fontSize: '0.95rem'}}>
                  <i className="fas fa-phone text-primary mr-2" style={{width: '20px'}}></i>
                  <span className="font-weight-bold text-main mr-2">Contact:</span>
                  {student.contact_number}
                </div>
                
                <div className="d-flex align-items-center mb-2 text-muted" style={{fontSize: '0.95rem'}}>
                  <i className="fas fa-clock text-primary mr-2" style={{width: '20px'}}></i>
                  <span className="font-weight-bold text-main mr-2">Schedule:</span>
                  {student.timings}
                </div>
                
                <div className="d-flex align-items-center mb-4 text-muted" style={{fontSize: '0.95rem'}}>
                  <i className="fas fa-map-marker-alt text-primary mr-2" style={{width: '20px'}}></i>
                  <span className="font-weight-bold text-main mr-2">Address:</span>
                  {student.address || 'N/A'}, {student.pincode || 'N/A'}
                </div>
                
                <div className="d-flex align-items-center justify-content-between pt-3 border-top">
                  <div className="d-flex align-items-center text-muted">
                     <i className="fas fa-rupee-sign text-primary mr-2" style={{width: '20px'}}></i>
                     <span className="font-weight-bold text-main">Budget:</span>
                  </div>
                  <span 
                    className="grade-badge high" 
                  >
                    ₹{student.budget}/month
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="fas fa-user-graduate"></i>
          </div>
          <h3>No Students Assigned Yet</h3>
          <p>You currently don't have any students. When students book sessions with you and you accept them, they'll appear here.</p>
        </div>
      )}
    </Layout>
  );
};

export default MyStudents;
