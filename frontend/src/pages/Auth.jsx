import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Auth.css';

const Auth = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const [loginData, setLoginData] = useState({ email: '', password: '', role: 'Student' });
  const [registerData, setRegisterData] = useState({
    role: 'Student', name: '', email: '', phone: '', gender: '',
    password: '', studentClass: '', city: '', subject: '', address: '', pincode: ''
  });
  const [certificate, setCertificate] = useState(null);

  const handleLoginChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });
  const handleRegisterChange = (e) => setRegisterData({ ...registerData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setCertificate(e.target.files.length > 0 ? e.target.files[0] : null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      const endpoint = loginData.role === 'Student'
        ? 'http://localhost:5000/api/auth/student/login'
        : 'http://localhost:5000/api/auth/teacher/login';

      const res = await axios.post(endpoint, { email: loginData.email, password: loginData.password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      setTimeout(() => {
        if (loginData.role === 'Student') {
          navigate('/student');
        } else {
          const userType = res.data.user.type;
          navigate(userType === 'Professional' ? '/professional' : '/peer');
        }
      }, 300);
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.msg || 'Invalid credentials.' });
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', text: '' });
    try {
      if (registerData.role === 'Student') {
        const res = await axios.post('http://localhost:5000/api/auth/student/register', registerData);
        setMsg({ type: 'success', text: res.data.msg });
        setActiveTab('login');
      } else {
        const formData = new FormData();
        Object.keys(registerData).forEach(key => {
          if (key !== 'role') formData.append(key, registerData[key]);
        });
        formData.append('type', registerData.role);
        if (registerData.role === 'Professional') {
          if (!certificate) {
            setMsg({ type: 'danger', text: 'Professional teachers must upload certification.' });
            setLoading(false);
            return;
          }
          formData.append('certificate', certificate);
        }
        const res = await axios.post('http://localhost:5000/api/auth/teacher/register', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setMsg({ type: 'success', text: res.data.msg });
        setActiveTab('login');
      }
    } catch (err) {
      setMsg({ type: 'danger', text: err.response?.data?.msg || 'Registration error.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Background Effects */}
      <div className="auth-bg-effects">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="auth-wrapper">
        {/* Left Hero Panel */}
        <div className="auth-hero">
          <div className="hero-content">
            <div className="hero-badge">
              <i className="fas fa-rocket"></i> Premium Education Platform
            </div>
            <h1>Welcome to <span className="text-gradient">EduLearning</span></h1>
            <p>Connect with expert tutors, track your progress, and achieve your academic goals with our production-grade platform.</p>
            
            <div className="hero-features">
              <div className="hero-feature">
                <div className="feature-icon"><i className="fas fa-map-marked-alt"></i></div>
                <div><strong>Location-Based</strong><span>Find tutors near you with maps</span></div>
              </div>
              <div className="hero-feature">
                <div className="feature-icon"><i className="fas fa-chart-line"></i></div>
                <div><strong>Track Progress</strong><span>Real-time performance analytics</span></div>
              </div>
              <div className="hero-feature">
                <div className="feature-icon"><i className="fas fa-comments"></i></div>
                <div><strong>In-App Messaging</strong><span>Chat directly with tutors</span></div>
              </div>
              <div className="hero-feature">
                <div className="feature-icon"><i className="fas fa-calendar-alt"></i></div>
                <div><strong>Smart Scheduling</strong><span>Book and manage sessions</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-container">
            <div className="auth-header">
              <div className="auth-logo">
                <i className="fas fa-graduation-cap"></i>
              </div>
              <h1>EduLearning</h1>
              <p>{activeTab === 'login' ? 'Sign in to your account' : 'Create a new account'}</p>
            </div>

            {msg.text && (
              <div className={`auth-alert auth-alert-${msg.type}`}>
                <i className={`fas ${msg.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                <span>{msg.text}</span>
              </div>
            )}

            <div className="auth-tabs">
              <button className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`} onClick={() => setActiveTab('login')}>Sign In</button>
              <button className={`auth-tab ${activeTab === 'register' ? 'active' : ''}`} onClick={() => setActiveTab('register')}>Register</button>
            </div>

            <div className="auth-content">
              {activeTab === 'login' && (
                <form className="auth-form" onSubmit={handleLoginSubmit}>
                  <div className="form-group role-selector">
                    <label>I am a...</label>
                    <div className="role-options">
                      <label className={`role-option ${loginData.role === 'Student' ? 'selected' : ''}`}>
                        <input type="radio" name="role" value="Student" checked={loginData.role === 'Student'} onChange={handleLoginChange} />
                        <i className="fas fa-user-graduate"></i> Student
                      </label>
                      <label className={`role-option ${loginData.role === 'Teacher' ? 'selected' : ''}`}>
                        <input type="radio" name="role" value="Teacher" checked={loginData.role === 'Teacher'} onChange={handleLoginChange} />
                        <i className="fas fa-chalkboard-teacher"></i> Teacher
                      </label>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <div className="input-with-icon">
                      <i className="fas fa-envelope"></i>
                      <input type="email" id="email" name="email" value={loginData.email} onChange={handleLoginChange} placeholder="you@example.com" required />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <div className="input-with-icon">
                      <i className="fas fa-lock"></i>
                      <input type="password" id="password" name="password" value={loginData.password} onChange={handleLoginChange} placeholder="••••••••" required />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-sign-in-alt"></i> Sign In</>}
                  </button>
                </form>
              )}

              {activeTab === 'register' && (
                <form className="auth-form" onSubmit={handleRegisterSubmit}>
                  <div className="form-group role-selector">
                    <label>Register as...</label>
                    <div className="role-options three-col">
                      <label className={`role-option ${registerData.role === 'Student' ? 'selected' : ''}`}>
                        <input type="radio" name="role" value="Student" checked={registerData.role === 'Student'} onChange={handleRegisterChange} />
                        <i className="fas fa-user-graduate"></i> Student
                      </label>
                      <label className={`role-option ${registerData.role === 'Peer' ? 'selected' : ''}`}>
                        <input type="radio" name="role" value="Peer" checked={registerData.role === 'Peer'} onChange={handleRegisterChange} />
                        <i className="fas fa-user-friends"></i> Peer
                      </label>
                      <label className={`role-option ${registerData.role === 'Professional' ? 'selected' : ''}`}>
                        <input type="radio" name="role" value="Professional" checked={registerData.role === 'Professional'} onChange={handleRegisterChange} />
                        <i className="fas fa-chalkboard-teacher"></i> Pro
                      </label>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Full Name</label>
                      <input type="text" name="name" value={registerData.name} onChange={handleRegisterChange} placeholder="John Doe" required />
                    </div>
                    <div className="form-group">
                      <label>Email</label>
                      <input type="email" name="email" value={registerData.email} onChange={handleRegisterChange} placeholder="john@example.com" required />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone</label>
                      <input type="tel" name="phone" value={registerData.phone} onChange={handleRegisterChange} placeholder="+91 98765 43210" required />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select name="gender" value={registerData.gender} onChange={handleRegisterChange} required>
                        <option value="" disabled>Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>

                  {registerData.role === 'Student' && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Class/Grade</label>
                        <input type="text" name="studentClass" value={registerData.studentClass} onChange={handleRegisterChange} placeholder="10th Grade" required />
                      </div>
                      <div className="form-group">
                        <label>City</label>
                        <input type="text" name="city" value={registerData.city} onChange={handleRegisterChange} placeholder="Hyderabad" required />
                      </div>
                    </div>
                  )}

                  {(registerData.role === 'Peer' || registerData.role === 'Professional') && (
                    <div className="form-group">
                      <label>Subject Specialization</label>
                      <input type="text" name="subject" value={registerData.subject} onChange={handleRegisterChange} placeholder="e.g. Mathematics" required />
                    </div>
                  )}

                  {registerData.role === 'Professional' && (
                    <div className="form-group">
                      <label>Certification (PDF only)</label>
                      <input type="file" name="certificate" onChange={handleFileChange} accept=".pdf" required />
                    </div>
                  )}

                  <div className="form-group">
                    <label>Address</label>
                    <input type="text" name="address" value={registerData.address} onChange={handleRegisterChange} placeholder="Full Address" required />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Pincode</label>
                      <input type="text" name="pincode" value={registerData.pincode} onChange={handleRegisterChange} placeholder="500001" required />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input type="password" name="password" value={registerData.password} onChange={handleRegisterChange} placeholder="Min 8 chars, A-z, special" required />
                    </div>
                  </div>

                  <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                    {loading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-user-plus"></i> Create Account</>}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
