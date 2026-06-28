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
import AnnualPlanner from "./pages/AnnualPlanner";
import Communication from './pages/Communication';
import Notification from './pages/Notification';
import SchoolInfo from './pages/SchoolInfo';
import Consents from './pages/Consents';
import Circulars from './pages/Circulars';
import SubjectManagement from './pages/SubjectManagement';
import SubjectTeachers from './pages/SubjectTeachers';
import RoomManagement from './pages/RoomManagement';
import CounselorProfile from './pages/CounselorProfile';
import FinanceProfile from './pages/FinanceProfile';
import StudentProfile from './pages/StudentProfile';
import TeacherProfile from './pages/TeacherProfile';
import ClassProfile from './pages/ClassProfile';
import StaffRoles from './pages/StaffRoles';
import ThoughtsManagement from "./pages/ThoughtsManagement";
import SpotlightManagement from "./pages/SpotlightManagement";
import StudentOfWeekManagement from "./pages/StudentOfWeekManagement";
import GalleryManagement from "./pages/GalleryManagement";
import ProfitLoss from './pages/ProfitLoss';

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
          <Route path="users/:type" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><UserManagement /></ProtectedRoute>} />
          <Route path="student-profile/:id" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><StudentProfile /></ProtectedRoute>} />
          <Route path="teacher-profile/:id" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><TeacherProfile /></ProtectedRoute>} />
          <Route path="counselor/:id" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><CounselorProfile /></ProtectedRoute>} />
          <Route path="finance-profile/:id" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><FinanceProfile /></ProtectedRoute>} />
          <Route path="admissions" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><AdmissionManagement /></ProtectedRoute>} />
          <Route path="classes" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><ClassManagement /></ProtectedRoute>} />
          <Route path="classes/:id" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><ClassProfile /></ProtectedRoute>} />
          <Route path="subjects" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><SubjectManagement /></ProtectedRoute>} />
          <Route path="subject-teachers" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><SubjectTeachers /></ProtectedRoute>} />
          <Route path="rooms" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><RoomManagement /></ProtectedRoute>} />
          <Route path="exams" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><Exams /></ProtectedRoute>} />
          <Route path="exams/results/:title/:class_id" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><ExamResults /></ProtectedRoute>} />
          <Route path="timetable" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><TimeTable /></ProtectedRoute>} />
          <Route path="annual-planner" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><AnnualPlanner /></ProtectedRoute>} />
          <Route path="notification" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><Notification /></ProtectedRoute>} />
          <Route path="school-info" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><SchoolInfo /></ProtectedRoute>} />
          <Route path="consents" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><Consents /></ProtectedRoute>} />
          <Route path="circulars" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><Circulars /></ProtectedRoute>} />
          <Route path="staff-roles" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><StaffRoles /></ProtectedRoute>} />
          <Route path="thoughts" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><ThoughtsManagement /></ProtectedRoute>} />
          <Route path="spotlight" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><SpotlightManagement /></ProtectedRoute>} />
          <Route path="student-of-week" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><StudentOfWeekManagement /></ProtectedRoute>} />
          <Route path="gallery" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><GalleryManagement /></ProtectedRoute>} />
          
          {/* Shared Admin / Teachers / etc (if applicable, but mainly admin for these) */}
          <Route path="attendance" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><Attendance /></ProtectedRoute>} />
          <Route path="attendance/class/:classId" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><AttendanceClassView /></ProtectedRoute>} />
          <Route path="attendance/student/:studentId" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><AttendanceStudentView /></ProtectedRoute>} />
          <Route path="attendance/status/:statusId" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><AttendanceFilteredView /></ProtectedRoute>} />
          <Route path="communication" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><Communication /></ProtectedRoute>} />
          <Route path="communication/:activeTab" element={<ProtectedRoute allowedRoles={["admin", "principal"]}><Communication /></ProtectedRoute>} />
          
          {/* Finance Only Routes */}
          <Route path="fees" element={<ProtectedRoute allowedRoles={["admin", "principal", "finance"]}><FeeManagement /></ProtectedRoute>} />
          <Route path="pnl" element={<ProtectedRoute allowedRoles={["admin", "principal", "finance"]}><ProfitLoss /></ProtectedRoute>} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
