import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./layouts/AdminLayout";
import UserManagement from "./pages/UserManagement";
import ClassManagement from "./pages/ClassManagement";
import Attendance from "./pages/Attendance";
import FeeManagement from "./pages/FeeManagement";
import AdmissionManagement from "./pages/AdmissionManagement";
import Exams from "./pages/Exams";
import TimeTable from "./pages/TimeTable";
import Events from './pages/Events';
import SalaryManagement from './pages/SalaryManagement';
import Communication from './pages/Communication';
import Notification from './pages/Notification';
import SchoolInfo from './pages/SchoolInfo';
import Complaints from './pages/Complaints';
import SubjectManagement from './pages/SubjectManagement';
import RoomManagement from './pages/RoomManagement';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
          <Route path="users/:type" element={<UserManagement />} />
          <Route path="classes" element={<ClassManagement />} />
          <Route path="attendance" element={<Attendance />} />
          <Route path="fees" element={<FeeManagement />} />
          <Route path="admissions" element={<AdmissionManagement />} />
          <Route path="subjects" element={<SubjectManagement />} />
          <Route path="rooms" element={<RoomManagement />} />
          <Route path="exams" element={<Exams />} />
          <Route path="timetable" element={<TimeTable />} />
          <Route path="events" element={<Events />} />
          <Route path="salary" element={<SalaryManagement />} />
          <Route path="communication" element={<Communication />} />
          <Route path="communication/:activeTab" element={<Communication />} />
          <Route path="notification" element={<Notification />} />
          <Route path="school-info" element={<SchoolInfo />} />
          <Route path="complaints" element={<Complaints />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
