import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import './Tutors.css';

const TutorsList = () => {
    return (
        <Layout type="student">
            <div className="tutors-header">
                <h1 className="tutors-title">Our Tutors</h1>
                <p className="tutors-subtitle">
                    Choose between professional educators or peer tutors based on your learning needs and budget.
                </p>
            </div>
            
            <div className="tutor-type-grid">
                {/* Professional Card */}
                <div className="tutor-type-card professional-card">
                    <div className="card-decoration"></div>
                    
                    <h3 className="type-title">Professional Teachers</h3>
                    <p className="type-desc">
                        Certified educators with extensive teaching experience and subject matter expertise.
                    </p>
                    
                    <ul className="type-features">
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            Advanced degrees (Master's or PhD)
                        </li>
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            5+ years of professional teaching experience
                        </li>
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            State-certified teaching credentials
                        </li>
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            Specialized in curriculum development
                        </li>
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            Personalized learning plans for each student
                        </li>
                    </ul>
                    
                    <div className="card-action">
                        <Link to="/professional-tutors" className="btn btn-professional w-100">
                            <i className="fas fa-chalkboard-teacher me-2"></i> View Professional Teachers
                        </Link>
                    </div>
                </div>
                
                {/* Peer Card */}
                <div className="tutor-type-card peer-card">
                    <div className="card-decoration"></div>
                    
                    <h3 className="type-title">Peer Tutors</h3>
                    <p className="type-desc">
                        Top-performing university students with strong academic backgrounds.
                    </p>
                    
                    <ul className="type-features">
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            Currently enrolled in prestigious universities
                        </li>
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            Top 5% academic performers in their field
                        </li>
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            Affordable tutoring rates
                        </li>
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            Relatable teaching approach
                        </li>
                        <li>
                            <i className="fas fa-check feature-icon"></i>
                            Recent exam experience and insights
                        </li>
                    </ul>
                    
                    <div className="card-action">
                        <Link to="/peer-tutors" className="btn btn-peer w-100">
                            <i className="fas fa-user-graduate me-2"></i> View Peer Tutors
                        </Link>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default TutorsList;
