import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import './StudentHome.css';

const StudentHome = () => {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userName = user.name || 'Student';
  const token = localStorage.getItem('token');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/dashboard/student', {
          headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

  const StatCard = ({ icon, iconBg, value, label, link }) => (
    <Link to={link || '#'} className="stat-card">
      <div className={`stat-icon-bg ${iconBg}`}>
        <i className={`${icon}`}></i>
      </div>
      <div className="stat-info">
        <h3>{loading ? <span className="skeleton" style={{width:'40px',height:'24px',display:'inline-block'}}></span> : value}</h3>
        <p>{label}</p>
      </div>
      <i className="fas fa-chevron-right stat-arrow"></i>
    </Link>
  );

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Layout type="student">
      <div className="dashboard-header">
        <div className="greeting-section">
          <h1 className="dashboard-greeting">
            Welcome back, <span className="text-gradient">{userName}</span> 👋
          </h1>
          <p className="dashboard-subtitle">
            Here's an overview of your learning journey
          </p>
        </div>
        <div className="header-actions">
          <Link to="/tutors" className="btn btn-primary">
            <i className="fas fa-search"></i> Find Tutors
          </Link>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="fas fa-chalkboard-teacher" iconBg="bg-primary-light text-primary"
          value={stats?.activeTutors || 0} label="Active Tutors" link="/bookings" />
        <StatCard icon="fas fa-calendar-check" iconBg="bg-info-light text-info"
          value={stats?.upcomingSessions || 0} label="Upcoming Sessions" link="/my-schedule" />
        <StatCard icon="fas fa-file-alt" iconBg="bg-warning-light text-warning"
          value={stats?.pendingTests || 0} label="Pending Tests" link="/view-tests" />
        <StatCard icon="fas fa-chart-line" iconBg="bg-success-light text-success"
          value={stats?.avgScore ? `${stats.avgScore}%` : '—'} label="Avg. Score" link="/student-progress" />
        <StatCard icon="fas fa-tasks" iconBg="bg-accent-light text-accent"
          value={stats?.pendingAssignments || 0} label="Pending Assignments" link="/my-assignments" />
        <StatCard icon="fas fa-comment-dots" iconBg="bg-secondary-light text-secondary"
          value={stats?.unreadMessages || 0} label="Unread Messages" link="/messages" />
      </div>

      {/* Next Session Card */}
      {stats?.nextSession && (
        <div className="next-session-card card animate-slide-up">
          <div className="next-session-header">
            <div className="next-session-badge">
              <i className="fas fa-clock"></i> Next Session
            </div>
          </div>
          <div className="next-session-body">
            <div className="session-detail">
              <i className="fas fa-user-tie"></i>
              <span>{stats.nextSession.teacher_name}</span>
            </div>
            <div className="session-detail">
              <i className="fas fa-calendar"></i>
              <span>{new Date(stats.nextSession.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="session-detail">
              <i className="fas fa-clock"></i>
              <span>{stats.nextSession.start_time} — {stats.nextSession.end_time}</span>
            </div>
            {stats.nextSession.topic && (
              <div className="session-detail">
                <i className="fas fa-book"></i>
                <span>{stats.nextSession.topic}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="dashboard-row">
        <div className="dashboard-section main-section">
          <div className="section-header">
            <h2 className="section-title">Quick Actions</h2>
          </div>
          
          <div className="action-grid">
            <Link to="/tutors" className="action-card">
              <div className="action-icon" style={{background: 'var(--primary-light)', color: 'var(--primary)'}}>
                <i className="fas fa-search"></i>
              </div>
              <div className="action-text">
                <h4>Find a Tutor</h4>
                <p>Browse & book tutors near you</p>
              </div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>
            
            <Link to="/tutor-map" className="action-card">
              <div className="action-icon" style={{background: 'var(--info-bg)', color: 'var(--info)'}}>
                <i className="fas fa-map-marked-alt"></i>
              </div>
              <div className="action-text">
                <h4>Tutor Map</h4>
                <p>View tutors on an interactive map</p>
              </div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>

            <Link to="/view-tests" className="action-card">
              <div className="action-icon" style={{background: 'var(--warning-bg)', color: 'var(--warning)'}}>
                <i className="fas fa-file-signature"></i>
              </div>
              <div className="action-text">
                <h4>Take a Test</h4>
                <p>Complete pending assessments</p>
              </div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>

            <Link to="/my-assignments" className="action-card">
              <div className="action-icon" style={{background: 'rgba(244, 63, 94, 0.12)', color: 'var(--accent)'}}>
                <i className="fas fa-tasks"></i>
              </div>
              <div className="action-text">
                <h4>Assignments</h4>
                <p>View & submit your homework</p>
              </div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>

            <Link to="/student-progress" className="action-card">
              <div className="action-icon" style={{background: 'var(--success-bg)', color: 'var(--success)'}}>
                <i className="fas fa-chart-bar"></i>
              </div>
              <div className="action-text">
                <h4>View Progress</h4>
                <p>Track your improvement</p>
              </div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>

            <Link to="/messages" className="action-card">
              <div className="action-icon" style={{background: 'var(--secondary-light)', color: 'var(--secondary)'}}>
                <i className="fas fa-comment-dots"></i>
              </div>
              <div className="action-text">
                <h4>Messages</h4>
                <p>Chat with your tutors</p>
              </div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>
          </div>
        </div>

        <div className="dashboard-section side-section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <Link to="/student-notifications" className="section-link">View All</Link>
          </div>
          
          <div className="update-list">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((notif, idx) => (
                <div className="update-item" key={notif.id || idx}>
                  <div className={`update-icon ${notif.status === 'unread' ? 'bg-primary-light text-primary' : 'bg-info-light text-info'}`}>
                    <i className={`fas ${notif.status === 'unread' ? 'fa-bell' : 'fa-check-circle'}`}></i>
                  </div>
                  <div className="update-content">
                    <p dangerouslySetInnerHTML={{ __html: notif.message }}></p>
                    <span className="update-time">{formatTimeAgo(notif.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <i className="fas fa-inbox empty-state-icon"></i>
                <h3>No activity yet</h3>
                <p>Start by finding a tutor!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StudentHome;
