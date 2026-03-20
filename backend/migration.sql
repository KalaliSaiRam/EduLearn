-- EduLearning Production Migration
-- Run this against the 'minorproject' database

-- Add geolocation columns to student_login
ALTER TABLE student_login ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL;
ALTER TABLE student_login ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL;
ALTER TABLE student_login ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL;
ALTER TABLE student_login ADD COLUMN bio TEXT DEFAULT NULL;

-- Add geolocation columns to teacher_login
ALTER TABLE teacher_login ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL;
ALTER TABLE teacher_login ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL;
ALTER TABLE teacher_login ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL;
ALTER TABLE teacher_login ADD COLUMN bio TEXT DEFAULT NULL;
ALTER TABLE teacher_login ADD COLUMN hourly_rate DECIMAL(10, 2) DEFAULT NULL;
ALTER TABLE teacher_login ADD COLUMN experience_years INT DEFAULT 0;
ALTER TABLE teacher_login ADD COLUMN rating DECIMAL(3, 2) DEFAULT 0.00;
ALTER TABLE teacher_login ADD COLUMN total_reviews INT DEFAULT 0;

-- Add scheduling columns to booking_request
ALTER TABLE booking_request ADD COLUMN scheduled_date DATE DEFAULT NULL;
ALTER TABLE booking_request ADD COLUMN scheduled_time TIME DEFAULT NULL;
ALTER TABLE booking_request ADD COLUMN session_duration INT DEFAULT 60;
ALTER TABLE booking_request ADD COLUMN session_notes TEXT DEFAULT NULL;
ALTER TABLE booking_request ADD COLUMN completed_at TIMESTAMP NULL DEFAULT NULL;

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_email VARCHAR(255) NOT NULL,
    teacher_email VARCHAR(255) NOT NULL,
    booking_id INT DEFAULT NULL,
    rating INT NOT NULL,
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignments table
CREATE TABLE IF NOT EXISTS assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_email VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    subject VARCHAR(255),
    due_date DATE DEFAULT NULL,
    max_marks INT DEFAULT 100,
    attachment_path VARCHAR(500) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assignment submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    student_name VARCHAR(255) NOT NULL,
    submission_path VARCHAR(500) NOT NULL,
    marks INT DEFAULT NULL,
    feedback TEXT DEFAULT NULL,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP NULL DEFAULT NULL
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT DEFAULT NULL,
    teacher_email VARCHAR(255) NOT NULL,
    student_email VARCHAR(255) NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    subject VARCHAR(255),
    topic VARCHAR(500),
    status ENUM('scheduled', 'in-progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_email VARCHAR(255) NOT NULL,
    receiver_email VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
