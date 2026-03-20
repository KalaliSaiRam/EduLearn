import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import './Notifications.css';

const StudentNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const res = await axios.get('http://localhost:5000/api/student/notifications', {
        headers: { 'x-auth-token': token }
      });

      setNotifications(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching notifications", err);
      setError('Failed to fetch notifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notifId = null, markAll = false) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/student/notifications/mark-read', 
        { notif_id: notifId, mark_all: markAll },
        { headers: { 'x-auth-token': token } }
      );
      
      // Refresh notifications locally
      if (markAll) {
         setNotifications(notifications.map(n => ({ ...n, status: 'read' })));
      } else {
         setNotifications(notifications.map(n => n.id === notifId ? { ...n, status: 'read' } : n));
      }
    } catch (err) {
      console.error("Error marking notification", err);
    }
  };

  const hasUnread = notifications.some(n => n.status === 'unread');

  return (
    <Layout type="student">
      <div className="notifications-header">
        <div>
          <h1 className="notifications-title">
            <i className="fas fa-bell text-primary"></i> Notifications
          </h1>
          <p className="text-muted mt-2 mb-0">Stay updated on your learning journey.</p>
        </div>
        
        {hasUnread && (
          <button 
            onClick={() => handleMarkRead(null, true)} 
            className="btn btn-primary"
          >
            <i className="fas fa-check-double me-2"></i> Mark All as Read
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center mt-5 py-5">
          <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
        </div>
      ) : error ? (
        <div className="auth-alert auth-alert-danger">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      ) : notifications.length > 0 ? (
        <div className="notifications-list">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`notification-card ${notif.status === 'unread' ? 'unread' : 'read'}`}
            >
              <div className="notification-icon">
                <i className={`fas ${notif.status === 'unread' ? 'fa-envelope' : 'fa-envelope-open'}`}></i>
              </div>
              
              <div className="notification-content">
                <div 
                  className="notification-message" 
                  dangerouslySetInnerHTML={{ __html: notif.message }}
                />
                
                <div className="notification-meta">
                  <div className="notification-time">
                    <i className="far fa-clock"></i>
                    {new Date(notif.created_at).toLocaleString()}
                  </div>
                  
                  <div className="notification-actions">
                    <span className={`notification-badge ${notif.status}`}>
                      {notif.status}
                    </span>
                    
                    {notif.status === 'unread' && (
                      <button 
                        onClick={() => handleMarkRead(notif.id, false)}
                        className="mark-read-btn"
                      >
                        <i className="fas fa-check me-1"></i> Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-notifications">
          <div className="empty-notifications-icon">
            <i className="far fa-bell"></i>
          </div>
          <h3>No notifications yet</h3>
          <p>You'll see important updates and announcements here when they arrive.</p>
        </div>
      )}
    </Layout>
  );
};

export default StudentNotifications;
