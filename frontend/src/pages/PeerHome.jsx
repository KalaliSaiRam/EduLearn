import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import './TutorHome.css';

const PeerHome = () => {
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const userName = user.name || 'Tutor';
  const token = localStorage.getItem('token');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/dashboard/tutor', {
          headers: { 'x-auth-token': token }
        });
        const data = await res.json();
        setStats(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchDashboard();
  }, [token]);

  const StatCard = ({ icon, iconBg, value, label, link }) => (
    <Link to={link || '#'} className="stat-card">
      <div className={`stat-icon-bg ${iconBg}`}>
        <i className={icon}></i>
      </div>
      <div className="stat-info">
        <h3>{loading ? <span className="skeleton" style={{width:'40px',height:'24px',display:'inline-block'}}></span> : value}</h3>
        <p>{label}</p>
      </div>
      <i className="fas fa-chevron-right stat-arrow"></i>
    </Link>
  );

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i key={i} className="fas fa-star" style={{ color: i <= Math.round(rating || 0) ? '#fbbf24' : 'var(--text-light)', fontSize: '0.85rem' }}></i>
      );
    }
    return stars;
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Layout type="teacher">
      <div className="dashboard-header">
        <div className="greeting-section">
          <h1 className="dashboard-greeting">
            Welcome back, <span className="text-gradient">{userName}</span> 🎓
          </h1>
          <p className="dashboard-subtitle">Here's your teaching overview — <span className="badge badge-info">Peer Tutor</span></p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard icon="fas fa-users" iconBg="bg-primary-light text-primary" value={stats?.activeStudents || 0} label="Active Students" link="/my-students" />
        <StatCard icon="fas fa-user-clock" iconBg="bg-warning-light text-warning" value={stats?.pendingRequests || 0} label="Pending Requests" link="/tutor-notifications" />
        <StatCard icon="fas fa-calendar-day" iconBg="bg-info-light text-info" value={stats?.todaySessions || 0} label="Today's Sessions" link="/tutor-schedule" />
        <StatCard icon="fas fa-calendar-week" iconBg="bg-success-light text-success" value={stats?.weekSessions || 0} label="This Week" link="/tutor-schedule" />
        <StatCard icon="fas fa-clipboard-check" iconBg="bg-accent-light text-accent" value={stats?.ungradedSubmissions || 0} label="Ungraded Tests" link="/view-submissions" />
        <StatCard icon="fas fa-star" iconBg="bg-warning-light text-warning"
          value={<span style={{display:'flex',alignItems:'center',gap:'0.35rem'}}>{stats?.avgRating || '—'} <span style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>({stats?.totalReviews || 0})</span></span>}
          label="Avg. Rating" link="/tutor-profile" />
      </div>

      {stats?.nextSession && (
        <div className="next-session-card card animate-slide-up" style={{marginBottom: '1.5rem'}}>
          <div className="next-session-header">
            <div className="next-session-badge"><i className="fas fa-clock"></i> Next Session</div>
          </div>
          <div className="next-session-body">
            <div className="session-detail"><i className="fas fa-user"></i><span>{stats.nextSession.student_name}</span></div>
            <div className="session-detail"><i className="fas fa-calendar"></i><span>{new Date(stats.nextSession.session_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></div>
            <div className="session-detail"><i className="fas fa-clock"></i><span>{stats.nextSession.start_time} — {stats.nextSession.end_time}</span></div>
            {stats.nextSession.topic && <div className="session-detail"><i className="fas fa-book"></i><span>{stats.nextSession.topic}</span></div>}
          </div>
        </div>
      )}

      <div className="dashboard-row">
        <div className="dashboard-section main-section">
          <div className="section-header"><h2 className="section-title">Quick Actions</h2></div>
          <div className="action-grid">
            <Link to="/create-test" className="action-card">
              <div className="action-icon" style={{background: 'var(--primary-light)', color: 'var(--primary)'}}><i className="fas fa-plus-circle"></i></div>
              <div className="action-text"><h4>Create Test</h4><p>Assess your students</p></div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>
            <Link to="/manage-assignments" className="action-card">
              <div className="action-icon" style={{background: 'var(--success-bg)', color: 'var(--success)'}}><i className="fas fa-tasks"></i></div>
              <div className="action-text"><h4>Assignments</h4><p>Create & manage homework</p></div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>
            <Link to="/tutor-schedule" className="action-card">
              <div className="action-icon" style={{background: 'var(--info-bg)', color: 'var(--info)'}}><i className="fas fa-calendar-alt"></i></div>
              <div className="action-text"><h4>Schedule</h4><p>Manage your sessions</p></div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>
            <Link to="/view-submissions" className="action-card">
              <div className="action-icon" style={{background: 'var(--warning-bg)', color: 'var(--warning)'}}><i className="fas fa-clipboard-check"></i></div>
              <div className="action-text"><h4>Grade Work</h4><p>Review student submissions</p></div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>
            <Link to="/messages" className="action-card">
              <div className="action-icon" style={{background: 'var(--secondary-light)', color: 'var(--secondary)'}}><i className="fas fa-comment-dots"></i></div>
              <div className="action-text"><h4>Messages</h4><p>Chat with students</p></div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>
            <Link to="/tutor-student-progress" className="action-card">
              <div className="action-icon" style={{background: 'rgba(244, 63, 94, 0.12)', color: 'var(--accent)'}}><i className="fas fa-chart-bar"></i></div>
              <div className="action-text"><h4>Progress</h4><p>Track student performance</p></div>
              <i className="fas fa-arrow-right action-arrow"></i>
            </Link>
          </div>
        </div>
        <div className="dashboard-section side-section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <Link to="/tutor-notifications" className="section-link">View All</Link>
          </div>
          <div className="update-list">
            {stats?.recentActivity?.length > 0 ? (
              stats.recentActivity.map((n, i) => (
                <div className="update-item" key={n.id || i}>
                  <div className={`update-icon ${n.status === 'unread' ? 'bg-primary-light text-primary' : 'bg-info-light text-info'}`}>
                    <i className={`fas ${n.status === 'unread' ? 'fa-bell' : 'fa-check-circle'}`}></i>
                  </div>
                  <div className="update-content">
                    <p dangerouslySetInnerHTML={{ __html: n.message }}></p>
                    <span className="update-time">{formatTimeAgo(n.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state"><i className="fas fa-inbox empty-state-icon"></i><h3>No activity yet</h3></div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PeerHome;
