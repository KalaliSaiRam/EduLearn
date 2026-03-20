-- =============================================
-- EduLearning — PostgreSQL Schema
-- Converted from MySQL dump
-- Run this file to create all tables:
--   psql -U your_user -d your_db -f init.sql
-- =============================================

-- Drop existing tables (in dependency order)
DROP TABLE IF EXISTS test_questions CASCADE;
DROP TABLE IF EXISTS test_submissions CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS assignment_submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS booking_request CASCADE;
DROP TABLE IF EXISTS teacher_login CASCADE;
DROP TABLE IF EXISTS student_login CASCADE;

-- Drop custom types if they exist
DROP TYPE IF EXISTS tutor_type CASCADE;
DROP TYPE IF EXISTS gender_type CASCADE;
DROP TYPE IF EXISTS booking_status CASCADE;
DROP TYPE IF EXISTS session_status CASCADE;
DROP TYPE IF EXISTS notification_status CASCADE;

-- =============================================
-- Custom ENUM Types
-- =============================================
CREATE TYPE tutor_type AS ENUM ('Professional', 'Peer');
CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE session_status AS ENUM ('scheduled', 'in-progress', 'completed', 'cancelled');
CREATE TYPE notification_status AS ENUM ('unread', 'read');

-- =============================================
-- Table: student_login
-- =============================================
CREATE TABLE student_login (
    name        VARCHAR(30) NOT NULL,
    email       VARCHAR(30) NOT NULL,
    phone       VARCHAR(10) NOT NULL,
    "class"     VARCHAR(10) NOT NULL,          -- "class" is a reserved word in PG
    address     TEXT NOT NULL,
    city        VARCHAR(15) NOT NULL,
    pincode     VARCHAR(6) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    gender      VARCHAR(10) NOT NULL,
    latitude    NUMERIC(10,8) DEFAULT NULL,
    longitude   NUMERIC(11,8) DEFAULT NULL,
    avatar_url  VARCHAR(500) DEFAULT NULL,
    bio         TEXT,

    PRIMARY KEY (name),
    CONSTRAINT student_name_unique UNIQUE (name),
    CONSTRAINT student_email_unique UNIQUE (email),
    CONSTRAINT student_phone_unique UNIQUE (phone)
);

-- =============================================
-- Table: teacher_login
-- =============================================
CREATE TABLE teacher_login (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(100) NOT NULL,
    email             VARCHAR(100) NOT NULL,
    phone             VARCHAR(15) NOT NULL,
    gender            gender_type NOT NULL,
    type              tutor_type NOT NULL,
    subject           VARCHAR(100) NOT NULL,
    address           TEXT NOT NULL,
    pincode           VARCHAR(10) NOT NULL,
    password          VARCHAR(255) NOT NULL,
    certificate_path  VARCHAR(255) DEFAULT NULL,
    latitude          NUMERIC(10,8) DEFAULT NULL,
    longitude         NUMERIC(11,8) DEFAULT NULL,
    avatar_url        VARCHAR(500) DEFAULT NULL,
    bio               TEXT,
    hourly_rate       NUMERIC(10,2) DEFAULT NULL,
    experience_years  INT DEFAULT 0,
    rating            NUMERIC(3,2) DEFAULT 0.00,
    total_reviews     INT DEFAULT 0,

    CONSTRAINT teacher_email_unique UNIQUE (email),
    CONSTRAINT teacher_name_unique UNIQUE (name)
);

-- =============================================
-- Table: booking_request
-- =============================================
CREATE TABLE booking_request (
    id                    SERIAL PRIMARY KEY,
    username              VARCHAR(30) NOT NULL,
    email                 VARCHAR(30) NOT NULL,
    contact_number        VARCHAR(10) NOT NULL,
    subject               VARCHAR(100) NOT NULL,
    budget                NUMERIC(5,0) NOT NULL,
    timings               TIME NOT NULL,
    required_tutor_type   tutor_type NOT NULL,
    status                VARCHAR(20) DEFAULT 'pending',
    teacher_email         VARCHAR(50) DEFAULT NULL,
    preferred_tutor_email VARCHAR(255) DEFAULT NULL,
    teacher_name          VARCHAR(255) DEFAULT NULL,
    scheduled_date        DATE DEFAULT NULL,
    scheduled_time        TIME DEFAULT NULL,
    session_duration      INT DEFAULT 60,
    session_notes         TEXT,
    completed_at          TIMESTAMPTZ DEFAULT NULL
);

-- =============================================
-- Table: messages
-- =============================================
CREATE TABLE messages (
    id              SERIAL PRIMARY KEY,
    sender_email    VARCHAR(255) NOT NULL,
    receiver_email  VARCHAR(255) NOT NULL,
    message_text    TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: notifications
-- =============================================
CREATE TABLE notifications (
    id          SERIAL PRIMARY KEY,
    user_email  VARCHAR(30) NOT NULL,
    message     TEXT NOT NULL,
    status      notification_status DEFAULT 'unread',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: reviews
-- =============================================
CREATE TABLE reviews (
    id              SERIAL PRIMARY KEY,
    student_email   VARCHAR(255) NOT NULL,
    teacher_email   VARCHAR(255) NOT NULL,
    booking_id      INT DEFAULT NULL,
    rating          INT NOT NULL,
    review_text     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: sessions
-- =============================================
CREATE TABLE sessions (
    id              SERIAL PRIMARY KEY,
    booking_id      INT DEFAULT NULL,
    teacher_email   VARCHAR(255) NOT NULL,
    student_email   VARCHAR(255) NOT NULL,
    session_date    DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    subject         VARCHAR(255) DEFAULT NULL,
    topic           VARCHAR(500) DEFAULT NULL,
    status          session_status DEFAULT 'scheduled',
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: assignments
-- =============================================
CREATE TABLE assignments (
    id              SERIAL PRIMARY KEY,
    teacher_email   VARCHAR(255) NOT NULL,
    teacher_name    VARCHAR(255) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    description     TEXT,
    subject         VARCHAR(255) DEFAULT NULL,
    due_date        DATE DEFAULT NULL,
    max_marks       INT DEFAULT 100,
    attachment_path VARCHAR(500) DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: assignment_submissions
-- =============================================
CREATE TABLE assignment_submissions (
    id              SERIAL PRIMARY KEY,
    assignment_id   INT NOT NULL,
    student_email   VARCHAR(255) NOT NULL,
    student_name    VARCHAR(255) NOT NULL,
    submission_path VARCHAR(500) NOT NULL,
    marks           INT DEFAULT NULL,
    feedback        TEXT,
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    graded_at       TIMESTAMPTZ DEFAULT NULL
);

-- =============================================
-- Table: tests
-- =============================================
CREATE TABLE tests (
    id              SERIAL PRIMARY KEY,
    teacher_name    VARCHAR(255) DEFAULT NULL,
    subject         VARCHAR(100) DEFAULT NULL,
    test_title      VARCHAR(255) DEFAULT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    description     VARCHAR(45) DEFAULT NULL,
    teacher_email   VARCHAR(45) DEFAULT NULL
);

-- =============================================
-- Table: test_questions
-- =============================================
CREATE TABLE test_questions (
    id          SERIAL PRIMARY KEY,
    test_id     INT DEFAULT NULL,
    question    TEXT,

    CONSTRAINT fk_test_questions_test
        FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
);

-- =============================================
-- Table: test_submissions
-- =============================================
CREATE TABLE test_submissions (
    id              SERIAL PRIMARY KEY,
    student_email   VARCHAR(255) NOT NULL,
    test_id         INT NOT NULL,
    pdf_path        VARCHAR(255) DEFAULT NULL,
    submitted_at    TIMESTAMPTZ DEFAULT NOW(),
    teacher_name    VARCHAR(100) DEFAULT NULL,
    test_title      VARCHAR(45) DEFAULT NULL,
    marks           INT DEFAULT NULL
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX idx_student_email ON student_login(email);
CREATE INDEX idx_teacher_email ON teacher_login(email);
CREATE INDEX idx_booking_email ON booking_request(email);
CREATE INDEX idx_booking_teacher ON booking_request(teacher_email);
CREATE INDEX idx_booking_status ON booking_request(status);
CREATE INDEX idx_messages_sender ON messages(sender_email);
CREATE INDEX idx_messages_receiver ON messages(receiver_email);
CREATE INDEX idx_notifications_user ON notifications(user_email);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_sessions_teacher ON sessions(teacher_email);
CREATE INDEX idx_sessions_student ON sessions(student_email);
CREATE INDEX idx_sessions_date ON sessions(session_date);
CREATE INDEX idx_tests_teacher ON tests(teacher_email);
CREATE INDEX idx_test_submissions_student ON test_submissions(student_email);
CREATE INDEX idx_test_submissions_test ON test_submissions(test_id);
CREATE INDEX idx_assignments_teacher ON assignments(teacher_email);
CREATE INDEX idx_assignment_subs_assignment ON assignment_submissions(assignment_id);
CREATE INDEX idx_reviews_teacher ON reviews(teacher_email);
