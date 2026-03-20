import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [showReview, setShowReview] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, review_text: '' });
  const [submitting, setSubmitting] = useState(false);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => { fetchBookings(); }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/student/bookings', {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = bookings.filter(b => {
    if (activeTab === 'pending') return b.status === 'pending';
    if (activeTab === 'accepted') return b.status === 'accepted';
    if (activeTab === 'completed') return b.status === 'completed' || b.status === 'rejected';
    return true;
  });

  const submitReview = async () => {
    if (!showReview) return;
    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({
          teacher_email: showReview.teacher_email,
          booking_id: showReview.id,
          rating: reviewData.rating,
          review_text: reviewData.review_text
        })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        setShowReview(null);
        setReviewData({ rating: 5, review_text: '' });
        fetchBookings();
      }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const statusBadge = (status) => {
    const map = {
      pending: { cls: 'badge-warning', icon: 'fa-clock', text: 'Pending' },
      accepted: { cls: 'badge-success', icon: 'fa-check', text: 'Active' },
      completed: { cls: 'badge-info', icon: 'fa-check-double', text: 'Completed' },
      rejected: { cls: 'badge-danger', icon: 'fa-times', text: 'Rejected' }
    };
    const s = map[status] || map.pending;
    return <span className={`badge ${s.cls}`}><i className={`fas ${s.icon}`} style={{ marginRight: '0.3rem' }}></i>{s.text}</span>;
  };

  const StarInput = ({ value, onChange }) => (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <i key={i} className={`fas fa-star`}
          style={{ fontSize: '1.75rem', cursor: 'pointer', color: i <= value ? '#fbbf24' : 'var(--text-light)', transition: 'color 0.15s ease, transform 0.15s ease' }}
          onClick={() => onChange(i)}
          onMouseEnter={e => e.target.style.transform = 'scale(1.2)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        ></i>
      ))}
    </div>
  );

  const renderStars = (rating) => {
    return [1,2,3,4,5].map(i => (
      <i key={i} className="fas fa-star" style={{ color: i <= Math.round(rating || 0) ? '#fbbf24' : 'var(--text-light)', fontSize: '0.8rem' }}></i>
    ));
  };

  return (
    <Layout type="student">
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              <i className="fas fa-calendar-check text-primary" style={{ marginRight: '0.75rem' }}></i>
              My Bookings
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {bookings.length} total bookings • {bookings.filter(b => b.status === 'accepted').length} active
            </p>
          </div>
          <Link to="/tutors" className="btn btn-primary">
            <i className="fas fa-plus"></i> Book a Tutor
          </Link>
        </div>

        <div className="tabs" style={{ maxWidth: '600px', marginBottom: '1.5rem' }}>
          {['pending', 'accepted', 'completed'].map(tab => (
            <button key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'pending' && <><i className="fas fa-clock" style={{marginRight:'0.4rem'}}></i>Pending ({bookings.filter(b=>b.status==='pending').length})</>}
              {tab === 'accepted' && <><i className="fas fa-check" style={{marginRight:'0.4rem'}}></i>Active ({bookings.filter(b=>b.status==='accepted').length})</>}
              {tab === 'completed' && <><i className="fas fa-archive" style={{marginRight:'0.4rem'}}></i>Done ({bookings.filter(b=>b.status==='completed'||b.status==='rejected').length})</>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }}></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <i className={`fas ${activeTab === 'pending' ? 'fa-hourglass-half' : activeTab === 'accepted' ? 'fa-handshake' : 'fa-archive'} empty-state-icon`}></i>
              <h3>No {activeTab === 'completed' ? 'completed/rejected' : activeTab} bookings</h3>
              <p>{activeTab === 'pending' ? 'Request a demo from the Find Tutors page!' : activeTab === 'accepted' ? 'Once a tutor accepts your demo, it will appear here.' : 'Completed and rejected bookings will show here.'}</p>
              {activeTab === 'pending' && (
                <Link to="/tutors" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                  <i className="fas fa-search"></i> Find Tutors
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map(booking => (
              <div key={booking.id} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                        {(booking.teacher_name_full || booking.teacher_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>
                          {booking.teacher_name_full || booking.teacher_name || 'Awaiting tutor'}
                        </h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                          {booking.teacher_subject || booking.subject} • {booking.required_tutor_type}
                          {booking.teacher_rating > 0 && <span style={{ marginLeft: '0.5rem' }}>{renderStars(booking.teacher_rating)}</span>}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {booking.budget && <span><i className="fas fa-wallet" style={{ marginRight: '0.35rem' }}></i>₹{booking.budget}</span>}
                      {booking.timings && <span><i className="fas fa-clock" style={{ marginRight: '0.35rem' }}></i>{booking.timings}</span>}
                      {booking.contact_number && <span><i className="fas fa-phone" style={{ marginRight: '0.35rem' }}></i>{booking.contact_number}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {statusBadge(booking.status)}
                  </div>
                </div>

                {/* Action buttons */}
                {booking.status === 'accepted' && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/messages?to=${booking.teacher_email}`)}>
                      <i className="fas fa-comment-dots"></i> Message Tutor
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowReview(booking)}>
                      <i className="fas fa-star"></i> Leave Review
                    </button>
                  </div>
                )}

                {booking.status === 'pending' && booking.teacher_email && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/messages?to=${booking.teacher_email}`)}>
                      <i className="fas fa-comment-dots"></i> Message Tutor
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Review Modal */}
        {showReview && (
          <div className="modal-overlay" onClick={() => setShowReview(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Rate {showReview.teacher_name_full || showReview.teacher_name}</h2>
                <button className="modal-close" onClick={() => setShowReview(null)}><i className="fas fa-times"></i></button>
              </div>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <StarInput value={reviewData.rating} onChange={v => setReviewData({ ...reviewData, rating: v })} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewData.rating]}
                </p>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label>Your Review (optional)</label>
                <textarea rows={4} value={reviewData.review_text} onChange={e => setReviewData({ ...reviewData, review_text: e.target.value })} placeholder="Share your experience..." />
              </div>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={submitReview} disabled={submitting}>
                {submitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane"></i> Submit Review</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BookingManagement;
