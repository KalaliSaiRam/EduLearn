import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = ({ type }) => {
  const navigate = useNavigate();
  const handleLogout = () => {
    navigate('/logout');
  };

  const isStudent = type === 'student';

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white fixed-top py-3 shadow-sm">
      <div className="container">
        <Link className="navbar-brand fw-bold text-primary d-flex align-items-center" to="/">
          <i className="fas fa-graduation-cap me-2"></i>EduLearning
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto align-items-lg-center">
            {isStudent && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/tutors">Tutors</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/student-progress">Progress</Link>
                </li>
              </>
            )}

            {!isStudent && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/my-students">Your Students</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/create-test">Create Tests</Link>
                </li>
              </>
            )}

            <li className="nav-item dropdown ms-lg-3">
              <a className="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown">
                <i className="fas fa-user-circle me-1"></i> Account
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
                <li>
                  <Link className="dropdown-item" to={isStudent ? '/student-profile' : '/tutor-profile'}>
                    <i className="fas fa-user me-2"></i> Profile
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger w-100 text-start" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i> Logout
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
