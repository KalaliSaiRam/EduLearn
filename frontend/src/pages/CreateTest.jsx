import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import './Assessment.css';

const CreateTest = () => {
  const [formData, setFormData] = useState({
    subject: '',
    test_title: '',
    description: ''
  });
  
  const [questions, setQuestions] = useState(['']);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Auto-fetch tutor's subject from profile
  useEffect(() => {
    const fetchSubject = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/profile/tutor', {
          headers: { 'x-auth-token': token }
        });
        if (res.data.subject) {
          setFormData(prev => ({ ...prev, subject: res.data.subject }));
        }
      } catch (err) { console.error('Failed to fetch tutor subject:', err); }
    };
    fetchSubject();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuestionChange = (index, value) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    setQuestions([...questions, '']);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    // Filter out empty questions
    const validQuestions = questions.filter(q => q.trim() !== '');

    if (validQuestions.length === 0) {
      setMessage({ type: 'danger', text: 'Please add at least one question.' });
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'danger', text: 'Not authenticated. Please log in.' });
        setSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        questions: validQuestions
      };

      const res = await axios.post('http://localhost:5000/api/tutor/create-test', payload, {
        headers: { 'x-auth-token': token }
      });

      if (res.data.success) {
        setMessage({ type: 'success', text: 'Test created successfully!' });
        // Reset form
        setFormData({ subject: '', test_title: '', description: '' });
        setQuestions(['']);
        
        // Clear success message after 3 seconds
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      console.error("Error creating test", err);
      setMessage({ 
        type: 'danger', 
        text: err.response?.data?.error || 'Failed to create test. Please try again.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout type="teacher">
      <div className="assessment-header">
        <h1 className="assessment-title text-primary">Create a New Test</h1>
        <p className="text-muted mt-2">Design an assessment to assign to your students.</p>
      </div>

      <div className="assessment-form-container">
        {message.text && (
          <div className={`auth-alert auth-alert-${message.type} mb-4`}>
            <i className={`fas ${message.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid mb-4">
            <div className="form-group mb-0">
              <label>Subject <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>(from your profile)</span></label>
              <input 
                type="text" 
                name="subject" 
                value={formData.subject} 
                onChange={handleChange} 
                placeholder="e.g. Mathematics"
                required 
                style={{ background: formData.subject ? 'var(--success-bg)' : undefined }}
              />
            </div>
            <div className="form-group mb-0">
              <label>Test Title</label>
              <input 
                type="text" 
                name="test_title" 
                value={formData.test_title} 
                onChange={handleChange} 
                placeholder="e.g. Algebra Midterm"
                required 
              />
            </div>
          </div>

          <div className="form-group mb-4">
            <label>Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows="3"
              placeholder="Brief description or instructions for the students..."
              required
            ></textarea>
          </div>

          <h3 className="section-title mb-4 mt-5">Questions</h3>
          
          {questions.map((question, index) => (
            <div key={index} className="question-block">
              <div className="question-header">
                <span className="question-number">Question {index + 1}</span>
                {questions.length > 1 && (
                  <button 
                    type="button" 
                    className="remove-question-btn" 
                    onClick={() => removeQuestion(index)}
                    title="Remove Question"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
              </div>
              <input 
                type="text" 
                value={question} 
                onChange={(e) => handleQuestionChange(index, e.target.value)} 
                placeholder="Enter question text here..."
                required 
              />
            </div>
          ))}
          
          <button 
            type="button" 
            className="add-question-btn" 
            onClick={addQuestion}
          >
            <i className="fas fa-plus"></i> Add Another Question
          </button>
          
          <div className="mt-5 text-right">
            <button 
              type="submit" 
              className="btn btn-primary px-5 py-3" 
              disabled={submitting}
            >
              {submitting ? (
                <><i className="fas fa-spinner fa-spin me-2"></i> Creating...</>
              ) : (
                <><i className="fas fa-save me-2"></i> Create Test</>
              )}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default CreateTest;
