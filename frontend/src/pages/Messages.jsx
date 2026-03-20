import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import API_BASE from '../config';

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [newChatName, setNewChatName] = useState('');
  const messagesEndRef = useRef(null);
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle ?to=email query param (from map/bookings)
  useEffect(() => {
    const toEmail = searchParams.get('to');
    if (toEmail) {
      // Look up name by searching conversations, or just use the email
      startChatWith(toEmail);
      // Clear the URL param
      setSearchParams({});
    }
  }, [searchParams]);

  const startChatWith = async (email) => {
    // Try to find existing conversation
    const existing = conversations.find(c => c.other_email === email);
    if (existing) {
      setSelectedChat(existing);
      return;
    }

    // Validate user exists in the system
    try {
      const res = await fetch(`${API_BASE}/api/profile/public/${email}`, {
        headers: { 'x-auth-token': token }
      });
      if (!res.ok) {
        alert('❌ User not found! You can only message registered members.');
        return;
      }
      const data = await res.json();
      // User is registered — open chat
      setSelectedChat({
        other_email: email,
        other_name: data.name || email,
        other_role: data.role || 'User',
        unread_count: 0,
        last_message: '',
        last_message_at: new Date().toISOString()
      });
      fetchMessages(email);
    } catch (err) {
      alert('❌ User not found! You can only message registered members.');
    }
  };

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat.other_email);
      const interval = setInterval(() => fetchMessages(selectedChat.other_email), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedChat?.other_email]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/conversations`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMessages = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/api/messages/${email}`, {
        headers: { 'x-auth-token': token }
      });
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (err) { console.error(err); }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ receiver_email: selectedChat.other_email, message_text: newMessage })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        // Refresh conversations to update sidebar
        fetchConversations();
      } else {
        console.error('Send failed:', data);
      }
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const handleNewChat = async () => {
    if (!newChatEmail.trim()) return;
    // Validate first, then close modal only if user found
    try {
      const res = await fetch(`${API_BASE}/api/profile/public/${newChatEmail.trim()}`, {
        headers: { 'x-auth-token': token }
      });
      if (!res.ok) {
        alert('❌ User not found! You can only message registered members.');
        return;
      }
    } catch (err) {
      alert('❌ User not found! You can only message registered members.');
      return;
    }
    await startChatWith(newChatEmail.trim());
    setShowNewChat(false);
    setNewChatEmail('');
    setNewChatName('');
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const userType = user.role === 'student' ? 'student' : 'teacher';

  return (
    <Layout type={userType}>
      <div className="animate-fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', gap: '0', overflow: 'hidden', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        {/* Conversation List */}
        <div style={{
          width: '320px', borderRight: '1px solid var(--border)', background: 'var(--bg-card)',
          display: 'flex', flexDirection: 'column', flexShrink: 0
        }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
              <i className="fas fa-comment-dots" style={{ marginRight: '0.5rem', color: 'var(--primary)' }}></i>
              Messages
            </h2>
            <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)} style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
              <i className="fas fa-plus"></i> New
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '1rem' }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '60px', marginBottom: '0.5rem' }}></div>)}
              </div>
            ) : conversations.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <i className="fas fa-comments empty-state-icon"></i>
                <h3>No conversations yet</h3>
                <p>Start a conversation from a tutor's profile or the map</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)} style={{ marginTop: '0.75rem' }}>
                  <i className="fas fa-plus"></i> New Message
                </button>
              </div>
            ) : (
              conversations.map((conv, idx) => (
                <div key={idx}
                  onClick={() => setSelectedChat(conv)}
                  style={{
                    padding: '0.875rem 1.25rem', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: selectedChat?.other_email === conv.other_email ? 'var(--primary-light)' : 'transparent',
                    transition: 'var(--transition-fast)', display: 'flex', alignItems: 'center', gap: '0.75rem'
                  }}
                >
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'var(--primary-gradient)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                  }}>
                    {conv.other_name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{conv.other_name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-light)' }}>{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <p style={{
                        fontSize: '0.8rem', color: 'var(--text-muted)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0
                      }}>{conv.last_message || 'No messages yet'}</p>
                      {conv.unread_count > 0 && (
                        <span style={{
                          background: 'var(--primary)', color: 'white', fontSize: '0.6rem',
                          fontWeight: 700, padding: '0.1rem 0.35rem', borderRadius: '999px', flexShrink: 0
                        }}>{conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
          {selectedChat ? (
            <>
              <div style={{
                padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)',
                background: 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--primary-gradient)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '0.8rem'
                }}>
                  {selectedChat.other_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedChat.other_name}</span>
                  <span className="badge badge-info" style={{ marginLeft: '0.5rem' }}>{selectedChat.other_role}</span>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <i className="fas fa-paper-plane" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.3 }}></i>
                    <p>No messages yet. Say hello! 👋</p>
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} style={{
                    display: 'flex',
                    justifyContent: msg.sender_email === user.email ? 'flex-end' : 'flex-start'
                  }}>
                    <div style={{
                      maxWidth: '70%', padding: '0.75rem 1rem',
                      borderRadius: msg.sender_email === user.email ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                      background: msg.sender_email === user.email ? 'var(--primary)' : 'var(--bg-card)',
                      color: msg.sender_email === user.email ? 'white' : 'var(--text-main)',
                      fontSize: '0.9rem', lineHeight: 1.5,
                      border: msg.sender_email === user.email ? 'none' : '1px solid var(--border)'
                    }}>
                      <p style={{ margin: 0 }}>{msg.message_text}</p>
                      <span style={{
                        fontSize: '0.65rem', opacity: 0.7, display: 'block',
                        textAlign: 'right', marginTop: '0.25rem'
                      }}>{formatTime(msg.created_at)}</span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div style={{
                padding: '1rem 1.5rem', borderTop: '1px solid var(--border)',
                background: 'var(--bg-card)', display: 'flex', gap: '0.75rem'
              }}>
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  style={{ flex: 1 }}
                  autoFocus
                />
                <button className="btn btn-primary" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                  <i className={`fas ${sending ? 'fa-spinner fa-spin' : 'fa-paper-plane'}`}></i>
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <i className="fas fa-comments empty-state-icon" style={{ fontSize: '4rem' }}></i>
              <h3>Select a conversation</h3>
              <p>Choose from your conversations or start a new one</p>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)} style={{ marginTop: '1rem' }}>
                <i className="fas fa-plus"></i> New Message
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>New Conversation</h2>
              <button className="modal-close" onClick={() => setShowNewChat(false)}><i className="fas fa-times"></i></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Recipient Email</label>
                <input type="email" value={newChatEmail} onChange={e => setNewChatEmail(e.target.value)}
                  placeholder="Enter tutor or student email" autoFocus />
              </div>
              <button className="btn btn-primary" onClick={handleNewChat} disabled={!newChatEmail.trim()}>
                <i className="fas fa-comment-dots"></i> Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Messages;
