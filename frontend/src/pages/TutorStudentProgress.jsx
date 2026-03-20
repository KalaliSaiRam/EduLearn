import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import './Progress.css';
import API_BASE from '../config';

const TutorStudentProgress = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
           setError('Not authenticated');
           setLoading(false);
           return;
        }

        const res = await axios.get(`${API_BASE}/api/tutor/student-progress`, {
          headers: {
            'x-auth-token': token
          }
        });

        setData(res.data);
      } catch (err) {
        console.error("Error fetching progress", err);
        setError('Failed to fetch student progress data.');
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const getPercentColorClass = (percent) => {
    if (percent < 50) return 'danger';
    if (percent < 80) return 'warning';
    return 'success';
  };

  const getMarksBadgeClass = (marks) => {
    if (marks === '-') return 'na';
    const num = parseFloat(marks);
    if (num >= 80) return 'high';
    if (num >= 50) return 'medium';
    return 'low';
  };

  return (
    <Layout type="teacher">
      <div className="progress-header">
        <h1 className="progress-title mb-0">
          <i className="fas fa-chart-line text-primary"></i> Student Progress Overview
        </h1>
        <p className="text-muted mt-2">Track the completion rates and average scores of all your students.</p>
      </div>

      {loading ? (
        <div className="text-center mt-5 py-5">
          <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
          <p className="mt-3 text-muted">Loading student data...</p>
        </div>
      ) : error ? (
        <div className="auth-alert auth-alert-danger text-center mt-5 max-w-2xl mx-auto">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      ) : data && data.students && data.students.length > 0 ? (
        <div className="progress-table-container">
          <div className="card-header">
            <h3>Student Performance</h3>
          </div>
          <div style={{overflowX: 'auto'}}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Student Info</th>
                  <th>Tests Assigned</th>
                  <th>Submitted</th>
                  <th>Completion Rate</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student, index) => (
                  <tr key={index}>
                    <td>
                      <div className="student-info-cell">
                        <div className="student-avatar">
                          {student.student_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="student-info-text">
                          <span className="student-name">{student.student_name}</span>
                          <span className="student-email">{student.student_email}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="fw-bold">{student.total_tests}</span></td>
                    <td><span className="text-primary fw-bold">{student.total_tests_submitted}</span></td>
                    <td>
                      <div className="progress-cell-wrapper">
                        <span className="progress-percent-text">{student.percent}%</span>
                        <div className="custom-progress-track">
                          <div 
                            className={`custom-progress-fill ${getPercentColorClass(student.percent)}`}
                            style={{ width: `${student.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`grade-badge ${getMarksBadgeClass(student.average_marks)}`}>
                        {student.average_marks}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-5 bg-card rounded" style={{border: '1px dashed var(--border)'}}>
          <i className="fas fa-user-graduate mb-3 text-muted" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
          <h4 className="text-main fw-bold">No students found yet</h4>
          <p className="text-muted">When students accept your requests and complete tests, their progress will appear here.</p>
        </div>
      )}
    </Layout>
  );
};

export default TutorStudentProgress;
