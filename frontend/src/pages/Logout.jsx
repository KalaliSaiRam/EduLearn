import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear the authentication tokens and state
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to home/portal selection
    navigate('/');
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.5rem' }}>
      Logging out...
    </div>
  );
};

export default Logout;
