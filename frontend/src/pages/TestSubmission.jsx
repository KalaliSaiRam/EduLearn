import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import './Assessment.css';

const TestSubmission = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [testDetails, setTestDetails] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchTestDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Not authenticated');
          setLoading(false);
          return;
        }

        const res = await axios.get(`http://localhost:5000/api/student-tests/${testId}/questions`, {
          headers: { 'x-auth-token': token }
        });

        if (res.data.error) {
          setError(res.data.error);
        } else {
          setTestDetails(res.data.test);
          setQuestions(res.data.questions);
        }
      } catch (err) {
        console.error("Error fetching test questions", err);
        setError('Failed to load test details.');
      } finally {
        setLoading(false);
      }
    };

    fetchTestDetails();
  }, [testId]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type !== 'application/pdf') {
       setError('Only PDF files are allowed.');
       setFile(null);
       return;
    }
    
    // Check file size (e.g., limit to 10MB)
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setError('File size should not exceed 10MB.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a PDF file to upload.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('pdf_file', file);
      formData.append('test_id', testId);

      const res = await axios.post('http://localhost:5000/api/student-tests/submit', formData, {
        headers: { 
          'x-auth-token': token,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess(res.data.msg);
      
      // Redirect after success
      setTimeout(() => {
        navigate('/view-tests');
      }, 2000);

    } catch (err) {
      console.error("Error submitting test", err);
      setError(err.response?.data?.error || 'An error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout type="student">
      <div className="assessment-header">
        <button onClick={() => navigate('/view-tests')} className="btn btn-secondary mb-3">
          <i className="fas fa-arrow-left me-2"></i> Back to Tests
        </button>

        {loading ? (
          <div className="text-center mt-4">
            <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
            <p className="mt-2 text-muted">Loading test details...</p>
          </div>
        ) : error && !testDetails ? (
           <div className="auth-alert auth-alert-danger text-center mt-4">
             <i className="fas fa-exclamation-circle"></i> {error}
           </div>
        ) : testDetails ? (
           <>
              <h1 className="assessment-title text-primary">{testDetails.test_title}</h1>
              <div className="mt-2 mb-3">
                 <span className="assessment-badge mr-2">{testDetails.subject}</span>
              </div>
              <p className="text-muted">{testDetails.description}</p>
           </>
        ) : null}
      </div>

      {testDetails && (
        <div className="assessment-form-container">
          <h3 className="section-title mb-4">Questions</h3>
          
          {questions.length > 0 ? (
            <div className="mb-5">
              {questions.map((q, index) => (
                <div key={q.id} className="question-block">
                  <div className="question-header">
                     <span className="question-number">Question {index + 1}</span>
                  </div>
                  <p className="mb-0 text-main" style={{fontSize: '1.1rem'}}>{q.question}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state mb-5" style={{padding: '2rem'}}>
              <p className="text-muted mb-0">No questions found for this test.</p>
            </div>
          )}

          <div className="submission-section border-top pt-4">
            <h3 className="section-title mb-3">Submit Your Answers</h3>
            <p className="text-muted mb-4">Please upload a single PDF file containing all your answers.</p>
            
            {error && <div className="auth-alert auth-alert-danger"><i className="fas fa-exclamation-circle me-2"></i>{error}</div>}
            {success && <div className="auth-alert auth-alert-success"><i className="fas fa-check-circle me-2"></i>{success} Redirecting...</div>}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <div className="file-upload-group" style={{textAlign: 'left'}}>
                  <label className="fw-bold mb-2">Upload Answer Sheet</label>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={handleFileChange}
                    disabled={submitting || success}
                    style={{width: '100%', padding: '0.75rem', background: 'white'}}
                  />
                  <small className="text-muted d-block mt-2">
                    <i className="fas fa-info-circle me-1"></i> Ensure your document is clear and under 10MB.
                  </small>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary w-100 py-3" 
                disabled={!file || submitting || success}
              >
                {submitting ? (
                  <><i className="fas fa-spinner fa-spin me-2"></i> Submitting...</>
                ) : (
                  <><i className="fas fa-cloud-upload-alt me-2"></i> Submit Answers</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default TestSubmission;
