import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import './Assessment.css';

const ViewSubmissions = () => {
  const [testTitles, setTestTitles] = useState([]);
  const [selectedTest, setSelectedTest] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For inline grading
  const [marksState, setMarksState] = useState({});
  const [gradingStatus, setGradingStatus] = useState({ id: null, status: '' });

  useEffect(() => {
    fetchTestTitles();
  }, []);

  useEffect(() => {
    if (selectedTest) {
      fetchSubmissions(selectedTest);
    } else {
      setSubmissions([]);
    }
  }, [selectedTest]);

  const fetchTestTitles = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await axios.get('http://localhost:5000/api/tutor/tests', {
        headers: { 'x-auth-token': token }
      });
      setTestTitles(res.data);
    } catch (err) {
      console.error("Error fetching test titles", err);
      setError('Failed to load your tests.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async (testTitle) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/tutor/submissions/${encodeURIComponent(testTitle)}`, {
        headers: { 'x-auth-token': token }
      });
      
      setSubmissions(res.data);
      
      // Initialize marks state for the inputs
      const initialMarks = {};
      res.data.forEach(sub => {
        initialMarks[sub.id] = sub.marks !== null ? sub.marks : '';
      });
      setMarksState(initialMarks);
      
    } catch (err) {
      console.error("Error fetching submissions", err);
      setError('Failed to load submissions for this test.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (id, value) => {
    setMarksState(prev => ({ ...prev, [id]: value }));
  };

  const handleGradeSubmit = async (e, submissionId) => {
    e.preventDefault();
    const marks = marksState[submissionId];
    
    if (marks === '' || marks === null) return;

    try {
      setGradingStatus({ id: submissionId, status: 'saving' });
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/api/tutor/grade-submission', 
        { submission_id: submissionId, marks: parseInt(marks) },
        { headers: { 'x-auth-token': token } }
      );
      
      setGradingStatus({ id: submissionId, status: 'success' });
      setTimeout(() => setGradingStatus({ id: null, status: '' }), 2000);

      // Update the local submission array so the UI reflects the change immediately
      setSubmissions(submissions.map(sub => 
        sub.id === submissionId ? { ...sub, marks: parseInt(marks) } : sub
      ));

    } catch (err) {
      console.error("Error saving grade", err);
      setGradingStatus({ id: submissionId, status: 'error' });
      setTimeout(() => setGradingStatus({ id: null, status: '' }), 3000);
    }
  };

  return (
    <Layout type="teacher">
      <div className="assessment-header">
        <h1 className="assessment-title text-primary">Test Submissions</h1>
        <p className="text-muted mt-2">Review and grade answers submitted by your students.</p>
      </div>

      <div className="assessment-form-container" style={{maxWidth: '1000px'}}>
        {error && <div className="auth-alert auth-alert-danger"><i className="fas fa-exclamation-circle me-2"></i>{error}</div>}

        <div className="form-group mb-5">
          <label><i className="fas fa-filter me-2"></i>Select Test to Review</label>
          <select 
            value={selectedTest} 
            onChange={(e) => setSelectedTest(e.target.value)}
            style={{background: 'white'}}
          >
            <option value="">-- Choose a Test --</option>
            {testTitles.map((test, index) => (
              <option key={index} value={test.test_title}>{test.test_title}</option>
            ))}
          </select>
        </div>

        {loading && selectedTest ? (
          <div className="text-center py-5">
            <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
          </div>
        ) : selectedTest && submissions.length > 0 ? (
          <div className="submission-list">
            {submissions.map(sub => (
              <div key={sub.id} className="submission-item">
                <div className="submission-info">
                  <h4>{sub.student_name}</h4>
                  <p>{sub.student_email}</p>
                  <p className="mt-2 text-primary" style={{fontSize: '0.8rem'}}>
                    <i className="far fa-clock me-1"></i> {new Date(sub.submitted_at).toLocaleString()}
                  </p>
                </div>
                
                <div className="submission-actions d-flex align-items-center gap-4">
                  <a 
                    href={`http://localhost:5000/${sub.pdf_path}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    <i className="fas fa-file-pdf me-2 text-danger"></i> View PDF
                  </a>

                  <div className="grading-section text-right">
                    {sub.marks === null ? (
                      <span className="assessment-badge text-warning mb-2 d-inline-block" style={{background: 'var(--warning-bg)'}}>
                         <i className="fas fa-hourglass-half me-1"></i> Pending
                      </span>
                    ) : (
                      <span className="assessment-badge text-success mb-2 d-inline-block" style={{background: 'var(--success-bg)'}}>
                         <i className="fas fa-check-circle me-1"></i> Graded
                      </span>
                    )}
                    
                    <form onSubmit={(e) => handleGradeSubmit(e, sub.id)} className="grade-input-group mt-1">
                      <input 
                        type="number" 
                        min="0" 
                        value={marksState[sub.id]} 
                        onChange={(e) => handleMarksChange(sub.id, e.target.value)}
                        placeholder="Score"
                        required
                        style={{padding: '0.4rem'}}
                      />
                      <button 
                        type="submit" 
                        className="btn btn-primary d-flex align-items-center justify-content-center"
                        style={{padding: '0.4rem 0.8rem', minWidth: '40px'}}
                        disabled={gradingStatus.id === sub.id && gradingStatus.status === 'saving'}
                      >
                        {gradingStatus.id === sub.id && gradingStatus.status === 'saving' ? (
                          <i className="fas fa-spinner fa-spin"></i>
                        ) : gradingStatus.id === sub.id && gradingStatus.status === 'success' ? (
                          <i className="fas fa-check text-success"></i>
                        ) : (
                          <i className="fas fa-save"></i>
                        )}
                      </button>
                    </form>
                    {gradingStatus.id === sub.id && gradingStatus.status === 'error' && (
                      <div className="text-danger small mt-1">Failed to save</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : selectedTest ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <i className="fas fa-inbox"></i>
            </div>
            <h3>No submissions found</h3>
            <p>Students haven't submitted any work for this test yet.</p>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <i className="fas fa-hand-pointer"></i>
            </div>
            <h3>Select a test to view submissions</h3>
            <p>Choose a test from the dropdown above to see student answers.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ViewSubmissions;
