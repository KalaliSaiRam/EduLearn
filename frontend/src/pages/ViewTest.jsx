import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import './Assessment.css';
import API_BASE from '../config';

const ViewTest = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const res = await axios.get(`${API_BASE}/api/student-tests/tests`, {
          headers: { 'x-auth-token': token }
        });

        if (res.data.msg) {
          setError(res.data.msg);
        } else {
          setTests(res.data.tests);
        }
      } catch (err) {
        console.error("Error fetching tests", err);
        setError('Failed to fetch tests.');
      } finally {
        setLoading(false);
      }
    };

    fetchTests();
  }, []);

  const handleTakeTest = (testId) => {
    navigate(`/take-test/${testId}`);
  };

  return (
    <Layout type="student">
      <div className="assessment-header">
        <h1 className="assessment-title text-primary">Available Assessments</h1>
        <p className="text-muted mt-2">View and complete tests assigned to you by your tutors.</p>
      </div>

      {loading ? (
        <div className="text-center mt-4">
          <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
          <p className="mt-2 text-muted">Loading assessments...</p>
        </div>
      ) : error ? (
        <div className="auth-alert auth-alert-danger text-center">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      ) : tests.length > 0 ? (
        <div className="assessment-grid">
          {tests.map(test => (
            <div key={test.id} className="assessment-card">
              <div className="assessment-card-header">
                <h3 className="assessment-card-title">{test.test_title}</h3>
                <span className="assessment-badge">{test.subject}</span>
              </div>
              
              <p className="assessment-desc">{test.description}</p>
              
              <div className="assessment-meta">
                <div className="meta-row">
                  <div>
                    <i className="fas fa-chalkboard-teacher"></i>
                    Tutor: <strong>{test.teacher_name}</strong>
                  </div>
                  <div>
                    <i className="far fa-calendar-alt"></i>
                    {new Date(test.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => handleTakeTest(test.id)} 
                className="btn btn-primary assessment-action"
              >
                Take Assessment <i className="fas fa-arrow-right ms-2"></i>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">
            <i className="fas fa-clipboard-list"></i>
          </div>
          <h3>No Assessments Available</h3>
          <p>You currently don't have any pending tests assigned by your tutors.</p>
        </div>
      )}
    </Layout>
  );
};

export default ViewTest;
