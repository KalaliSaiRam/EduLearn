import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import './Notifications.css';

const TutorNotifications = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const res = await axios.get('http://localhost:5000/api/tutor/notifications', {
        headers: { 'x-auth-token': token }
      });

      setRequests(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching tutor notifications", err);
      setError('Failed to fetch requests.');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId, actionType) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/tutor/notifications/action', 
        { request_id: requestId, action: actionType },
        { headers: { 'x-auth-token': token } }
      );
      
      setActionMessage(res.data.msg);
      // Remove the handled request from the list (or update its status if you prefer)
      setRequests(requests.filter(req => req.id !== requestId));
      
      // Clear message after 3 seconds
      setTimeout(() => setActionMessage(''), 3000);
    } catch (err) {
      console.error(`Error performing action ${actionType}`, err);
      setError(`Failed to perform action: ${actionType}`);
    }
  };

  return (
    <Layout type="teacher">
      <div className="notifications-header">
        <div>
          <h1 className="notifications-title">
            <i className="fas fa-user-plus text-primary"></i> New Student Requests
          </h1>
          <p className="text-muted mt-2 mb-0">Review and respond to students requesting to join your classes.</p>
        </div>
      </div>

      {actionMessage && (
        <div className="auth-alert auth-alert-success mb-4">
          <i className="fas fa-check-circle"></i> {actionMessage}
        </div>
      )}

      {error ? (
        <div className="auth-alert auth-alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      ) : loading ? (
        <div className="text-center mt-5 py-5">
          <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
        </div>
      ) : requests.length > 0 ? (
        <div className="notifications-list">
          {requests.map(req => (
            <div key={req.id} className="notification-card unread" style={{flexDirection: 'column', gap: '1rem'}}>
              
              <div className="d-flex justify-content-between align-items-start w-100">
                 <div className="d-flex align-items-center gap-3">
                    <div className="notification-icon" style={{background: 'var(--primary)', color: 'white'}}>
                       {req.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="m-0" style={{fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)'}}>
                        {req.username}
                      </h3>
                      <span className="assessment-badge mt-1 d-inline-block">{req.subject}</span>
                    </div>
                 </div>
                 
                 <div className="text-muted small">
                    <i className="far fa-clock mr-1"></i> Requested Just Now
                 </div>
              </div>
              
              <div className="form-grid mt-2" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem'}}>
                <div className="info-item">
                   <span className="info-label text-muted"><i className="fas fa-phone text-primary mr-1"></i> Contact</span>
                   <span className="info-value text-main font-weight-bold">{req.contact_number}</span>
                </div>
                <div className="info-item">
                   <span className="info-label text-muted"><i className="fas fa-clock text-primary mr-1"></i> Preferred Time</span>
                   <span className="info-value text-main font-weight-bold">{req.timings}</span>
                </div>
                <div className="info-item">
                   <span className="info-label text-muted"><i className="fas fa-map-marker-alt text-primary mr-1"></i> Location</span>
                   <span className="info-value text-main font-weight-bold">{req.address}, {req.pincode}</span>
                </div>
                <div className="info-item">
                   <span className="info-label text-muted"><i className="fas fa-rupee-sign text-primary mr-1"></i> Budget</span>
                   <span className="info-value text-success font-weight-bold">₹{req.budget}/month</span>
                </div>
              </div>
              
              <div className="tutor-notification-actions">
                <button 
                  onClick={() => handleAction(req.id, 'accept')}
                  className="tutor-action-btn accept" 
                >
                  <i className="fas fa-check"></i> Accept Student
                </button>
                <button 
                  onClick={() => handleAction(req.id, 'reject')}
                  className="tutor-action-btn reject" 
                >
                  <i className="fas fa-times"></i> Reject
                </button>
                <button 
                  onClick={() => handleAction(req.id, 'pending')}
                  className="btn btn-outline-secondary" 
                  style={{fontWeight: 600, padding: '0.5rem 1.5rem', borderRadius: 'var(--radius-md)'}}
                >
                  <i className="fas fa-pause mr-2"></i> Mark Pending
                </button>
              </div>
              
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-notifications">
          <div className="empty-notifications-icon">
            <i className="fas fa-user-plus"></i>
          </div>
          <h3>No new student requests</h3>
          <p>You'll see new student demo and class requests here when they arrive.</p>
        </div>
      )}
    </Layout>
  );
};

export default TutorNotifications;
