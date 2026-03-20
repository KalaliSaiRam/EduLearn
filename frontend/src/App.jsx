import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Auth from './pages/Auth';
import StudentHome from './pages/StudentHome';
import PeerHome from './pages/PeerHome';
import ProfessionalHome from './pages/ProfessionalHome';
import Tutors from './pages/Tutors';
import Logout from './pages/Logout';
import StudentProfile from './pages/StudentProfile';
import TutorProfile from './pages/TutorProfile';
import StudentProgress from './pages/StudentProgress';
import TutorStudentProgress from './pages/TutorStudentProgress';
import StudentNotifications from './pages/StudentNotifications';
import TutorNotifications from './pages/TutorNotifications';
import ViewTest from './pages/ViewTest';
import TestSubmission from './pages/TestSubmission';
import CreateTest from './pages/CreateTest';
import ViewSubmissions from './pages/ViewSubmissions';
import MyStudents from './pages/MyStudents';
import PeerDisplay from './pages/PeerDisplay';
import ProfessionalDisplay from './pages/ProfessionalDisplay';

// ─── New Production Features ───
import TutorMap from './pages/TutorMap';
import StudentMap from './pages/StudentMap';
import Messages from './pages/Messages';
import Schedule from './pages/Schedule';
import Assignments from './pages/Assignments';
import BookingManagement from './pages/BookingManagement';

import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/global.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Auth />} />
        <Route path="/logout" element={<Logout />} />

        {/* Student Routes */}
        <Route path="/student" element={<StudentHome />} />
        <Route path="/tutors" element={<Tutors />} />
        <Route path="/tutor-map" element={<TutorMap />} />
        <Route path="/bookings" element={<BookingManagement />} />
        <Route path="/my-schedule" element={<Schedule />} />
        <Route path="/view-tests" element={<ViewTest />} />
        <Route path="/take-test/:testId" element={<TestSubmission />} />
        <Route path="/my-assignments" element={<Assignments />} />
        <Route path="/student-progress" element={<StudentProgress />} />
        <Route path="/student-notifications" element={<StudentNotifications />} />
        <Route path="/student-profile" element={<StudentProfile />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/peer-tutors" element={<PeerDisplay />} />
        <Route path="/professional-tutors" element={<ProfessionalDisplay />} />

        {/* Tutor Routes */}
        <Route path="/peer" element={<PeerHome />} />
        <Route path="/professional" element={<ProfessionalHome />} />
        <Route path="/my-students" element={<MyStudents />} />
        <Route path="/student-map" element={<StudentMap />} />
        <Route path="/tutor-schedule" element={<Schedule />} />
        <Route path="/create-test" element={<CreateTest />} />
        <Route path="/view-submissions" element={<ViewSubmissions />} />
        <Route path="/manage-assignments" element={<Assignments />} />
        <Route path="/tutor-student-progress" element={<TutorStudentProgress />} />
        <Route path="/tutor-notifications" element={<TutorNotifications />} />
        <Route path="/tutor-profile" element={<TutorProfile />} />
      </Routes>
    </Router>
  );
}

export default App;
