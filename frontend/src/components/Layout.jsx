import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import './Layout.css';

const Layout = ({ children, type }) => {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);

  // ─── Theme ───
  const [theme, setTheme] = useState(() => localStorage.getItem('eduTheme') || 'dark');

  const navigate = useNavigate();
  const location = useLocation();
  
  const userString = localStorage.getItem('user');
  const user = userString ? JSON.parse(userString) : {};
  const userName = user.name || (type === 'student' ? 'Student' : 'Tutor');
  const token = localStorage.getItem('token');

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eduTheme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Save collapsed preference
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', collapsed);
  }, [collapsed]);

  // Fetch unread counts
  useEffect(() => {
    const fetchCounts = async () => {
      if (!token) return;
      try {
        const headers = { 'x-auth-token': token };

        const onNotifPage = location.pathname.includes('notification');
        const onMsgPage = location.pathname === '/messages';

        if (!onNotifPage) {
          try {
            if (type === 'student' || user.role === 'student') {
              const notifRes = await fetch('http://localhost:5000/api/student/notifications', { headers }).then(r => r.json());
              if (Array.isArray(notifRes)) setUnreadNotifs(notifRes.filter(n => n.status === 'unread').length);
            } else {
              const notifRes = await fetch('http://localhost:5000/api/tutor/notifications', { headers }).then(r => r.json());
              if (Array.isArray(notifRes)) setUnreadNotifs(notifRes.length);
            }
          } catch (e) { /* ignore */ }
        } else {
          setUnreadNotifs(0);
          if (type === 'student' || user.role === 'student') {
            try { await fetch('http://localhost:5000/api/student/notifications/mark-read', { method: 'POST', headers }); } catch (e) { /* ignore */ }
          }
        }

        if (!onMsgPage) {
          try {
            const msgRes = await fetch('http://localhost:5000/api/messages/unread/count', { headers }).then(r => r.json());
            if (msgRes.count !== undefined) setUnreadMsgs(msgRes.count);
          } catch (e) { /* ignore */ }
        } else {
          setUnreadMsgs(0);
        }
      } catch (e) { /* silently fail */ }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [token, location.pathname, type]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const toggleCollapse = () => setCollapsed(!collapsed);
  const toggleMobile = () => setMobileOpen(!mobileOpen);

  // ─── Grouped Sidebar Links ───
  const studentLinks = [
    { section: 'Overview' },
    { path: '/student', icon: 'fas fa-th-large', label: 'Dashboard' },
    { section: 'Learning' },
    { path: '/tutors', icon: 'fas fa-search', label: 'Find Tutors' },
    { path: '/tutor-map', icon: 'fas fa-map-marked-alt', label: 'Tutor Map' },
    { path: '/bookings', icon: 'fas fa-calendar-check', label: 'My Bookings' },
    { path: '/my-schedule', icon: 'fas fa-clock', label: 'Schedule' },
    { section: 'Academics' },
    { path: '/view-tests', icon: 'fas fa-file-alt', label: 'Tests' },
    { path: '/my-assignments', icon: 'fas fa-tasks', label: 'Assignments' },
    { path: '/student-progress', icon: 'fas fa-chart-line', label: 'Progress' },
    { section: 'Connect' },
    { path: '/messages', icon: 'fas fa-comment-dots', label: 'Messages', badge: unreadMsgs },
    { path: '/student-notifications', icon: 'fas fa-bell', label: 'Notifications', badge: unreadNotifs },
  ];

  const teacherLinks = [
    { section: 'Overview' },
    { path: user.type === 'Professional' ? '/professional' : '/peer', icon: 'fas fa-th-large', label: 'Dashboard' },
    { section: 'Students' },
    { path: '/my-students', icon: 'fas fa-users', label: 'My Students' },
    { path: '/student-map', icon: 'fas fa-map-marked-alt', label: 'Student Map' },
    { path: '/tutor-schedule', icon: 'fas fa-calendar-alt', label: 'Schedule' },
    { section: 'Academics' },
    { path: '/create-test', icon: 'fas fa-plus-circle', label: 'Create Test' },
    { path: '/view-submissions', icon: 'fas fa-clipboard-check', label: 'Submissions' },
    { path: '/manage-assignments', icon: 'fas fa-tasks', label: 'Assignments' },
    { path: '/tutor-student-progress', icon: 'fas fa-chart-bar', label: 'Progress' },
    { section: 'Connect' },
    { path: '/messages', icon: 'fas fa-comment-dots', label: 'Messages', badge: unreadMsgs },
    { path: '/tutor-notifications', icon: 'fas fa-bell', label: 'Notifications', badge: unreadNotifs },
  ];

  const links = type === 'student' ? studentLinks : teacherLinks;

  // Get current page label for breadcrumb
  const currentPage = links.find(l => l.path && l.path === location.pathname)?.label || 'Page';

  return (
    <div className={`layout-container ${collapsed ? 'sidebar-collapsed' : ''}`}>
      {mobileOpen && <div className="sidebar-overlay" onClick={toggleMobile}></div>}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <Link to={type === 'student' ? '/student' : (user.type === 'Professional' ? '/professional' : '/peer')} className="brand">
            <div className="brand-logo">
              <i className="fas fa-graduation-cap"></i>
            </div>
            <span className="brand-text">EduLearning</span>
          </Link>
          <button className="close-sidebar mobile-only" onClick={toggleMobile}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul>
            {links.map((link, idx) => {
              if (link.section) {
                return (
                  <li key={`section-${idx}`} className="sidebar-section-label">
                    {link.section}
                  </li>
                );
              }
              return (
                <li key={idx}>
                  <Link 
                    to={link.path} 
                    className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    title={collapsed ? link.label : ''}
                  >
                    <i className={`${link.icon} nav-icon`}></i>
                    <span className="nav-label">{link.label}</span>
                    {link.badge > 0 && (
                      <span className={`nav-badge ${collapsed ? 'collapsed-badge' : ''}`}>
                        {link.badge > 99 ? '99+' : link.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <Link 
            to={type === 'student' ? '/student-profile' : '/tutor-profile'} 
            className="sidebar-user-card sidebar-profile-link"
            onClick={() => setMobileOpen(false)}
          >
            <div className="sidebar-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{userName}</span>
              <span className="sidebar-user-role">{type === 'student' ? 'Student' : (user.type || 'Tutor')}</span>
            </div>
          </Link>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <i className="fas fa-sign-out-alt"></i>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          {/* Mobile hamburger */}
          <button className="menu-toggle mobile-only" onClick={toggleMobile}>
            <i className="fas fa-bars"></i>
          </button>

          {/* Desktop collapse toggle */}
          <button className="collapse-toggle desktop-only" onClick={toggleCollapse} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <i className={`fas ${collapsed ? 'fa-indent' : 'fa-outdent'}`}></i>
          </button>
          
          <div className="topbar-center">
            <div className="breadcrumb">
              <span className="breadcrumb-page">{currentPage}</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* Theme Toggle */}
            <button className="topbar-icon-btn theme-toggle-btn" onClick={toggleTheme} data-tooltip={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}>
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>

            <Link to="/messages" className="topbar-icon-btn" data-tooltip="Messages">
              <i className="fas fa-comment-dots"></i>
              {unreadMsgs > 0 && <span className="icon-badge">{unreadMsgs}</span>}
            </Link>
            <Link to={type === 'student' ? '/student-notifications' : '/tutor-notifications'} className="topbar-icon-btn" data-tooltip="Notifications">
              <i className="fas fa-bell"></i>
              {unreadNotifs > 0 && <span className="icon-badge">{unreadNotifs}</span>}
            </Link>
            <div className="user-profile" title={userName}>
              <div className="user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="user-name-topbar">{userName.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        <div className="page-content animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
