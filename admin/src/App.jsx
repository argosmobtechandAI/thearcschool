import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./layouts/AdminLayout";
import UserManagement from "./pages/UserManagement";
import AdmissionManagement from "./pages/AdmissionManagement";
import ClassManagement from "./pages/ClassManagement";
import Attendance from "./pages/Attendance";
import AttendanceClassView from "./pages/AttendanceClassView";
import AttendanceStudentView from "./pages/AttendanceStudentView";
import AttendanceFilteredView from "./pages/AttendanceFilteredView";
import FeeManagement from "./pages/FeeManagement";
import Exams from "./pages/Exams";
import ExamResults from "./pages/ExamResults";
import TimeTable from "./pages/TimeTable";
import Events from './pages/Events';
import SalaryManagement from './pages/SalaryManagement';
import Communication from './pages/Communication';
import Notification from './pages/Notification';
import SchoolInfo from './pages/SchoolInfo';
import Complaints from './pages/Complaints';
import SubjectManagement from './pages/SubjectManagement';
import RoomManagement from './pages/RoomManagement';
import CounselorProfile from './pages/CounselorProfile';
import FinanceProfile from './pages/FinanceProfile';
import Holidays from './pages/Holidays';
import StudentProfile from './pages/StudentProfile';
import TeacherProfile from './pages/TeacherProfile';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (allowedRoles && user && !allowedRoles.includes(user.type)) {
    // If user tries to access a route they shouldn't, kick them to dashboard
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <ToastContainer theme="dark" position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* Admin Only Routes */}
          <Route path="users/:type" element={<ProtectedRoute allowedRoles={["admin"]}><UserManagement /></ProtectedRoute>} />
          <Route path="student-profile/:id" element={<ProtectedRoute allowedRoles={["admin"]}><StudentProfile /></ProtectedRoute>} />
          <Route path="teacher-profile/:id" element={<ProtectedRoute allowedRoles={["admin"]}><TeacherProfile /></ProtectedRoute>} />
          <Route path="counselor/:id" element={<ProtectedRoute allowedRoles={["admin"]}><CounselorProfile /></ProtectedRoute>} />
          <Route path="finance-profile/:id" element={<ProtectedRoute allowedRoles={["admin"]}><FinanceProfile /></ProtectedRoute>} />
          <Route path="admissions" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><AdmissionManagement /></ProtectedRoute>} />
          <Route path="classes" element={<ProtectedRoute allowedRoles={["admin"]}><ClassManagement /></ProtectedRoute>} />
          <Route path="subjects" element={<ProtectedRoute allowedRoles={["admin"]}><SubjectManagement /></ProtectedRoute>} />
          <Route path="rooms" element={<ProtectedRoute allowedRoles={["admin"]}><RoomManagement /></ProtectedRoute>} />
          <Route path="exams" element={<ProtectedRoute allowedRoles={["admin"]}><Exams /></ProtectedRoute>} />
          <Route path="exams/results/:title/:class_id" element={<ProtectedRoute allowedRoles={["admin"]}><ExamResults /></ProtectedRoute>} />
          <Route path="timetable" element={<ProtectedRoute allowedRoles={["admin"]}><TimeTable /></ProtectedRoute>} />
          <Route path="events" element={<ProtectedRoute allowedRoles={["admin"]}><Events /></ProtectedRoute>} />
          <Route path="holidays" element={<ProtectedRoute allowedRoles={["admin"]}><Holidays /></ProtectedRoute>} />
          <Route path="salary" element={<ProtectedRoute allowedRoles={["admin"]}><SalaryManagement /></ProtectedRoute>} />
          <Route path="notification" element={<ProtectedRoute allowedRoles={["admin"]}><Notification /></ProtectedRoute>} />
          <Route path="school-info" element={<ProtectedRoute allowedRoles={["admin"]}><SchoolInfo /></ProtectedRoute>} />
          <Route path="complaints" element={<ProtectedRoute allowedRoles={["admin"]}><Complaints /></ProtectedRoute>} />
          
          {/* Shared Admin / Teachers / etc (if applicable, but mainly admin for these) */}
          <Route path="attendance" element={<ProtectedRoute allowedRoles={["admin"]}><Attendance /></ProtectedRoute>} />
          <Route path="attendance/class/:classId" element={<ProtectedRoute allowedRoles={["admin"]}><AttendanceClassView /></ProtectedRoute>} />
          <Route path="attendance/student/:studentId" element={<ProtectedRoute allowedRoles={["admin"]}><AttendanceStudentView /></ProtectedRoute>} />
          <Route path="attendance/status/:statusId" element={<ProtectedRoute allowedRoles={["admin"]}><AttendanceFilteredView /></ProtectedRoute>} />
          <Route path="communication" element={<ProtectedRoute allowedRoles={["admin"]}><Communication /></ProtectedRoute>} />
          <Route path="communication/:activeTab" element={<ProtectedRoute allowedRoles={["admin"]}><Communication /></ProtectedRoute>} />
          
          {/* Finance Only Routes */}
          <Route path="fees" element={<ProtectedRoute allowedRoles={["admin", "finance"]}><FeeManagement /></ProtectedRoute>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
