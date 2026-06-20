import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useSelector } from 'react-redux';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import Reports from './pages/Reports';

import DashboardMetrics from './pages/DashboardMetrics';
import FeeStructures from './pages/FeeStructures';
import IncomeLedger from './pages/IncomeLedger';
import ExpenseLedger from './pages/ExpenseLedger';
import IncomeCategories from './pages/IncomeCategories';
import ExpenseCategories from './pages/ExpenseCategories';
import ProfitLoss from './pages/ProfitLoss';
import FinanceLayout from './layouts/FinanceLayout';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<PrivateRoute><FinanceLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="ledger" element={<Ledger />} />

          <Route path="fee-structures" element={<FeeStructures />} />
          <Route path="income" element={<IncomeLedger />} />
          <Route path="expenses" element={<ExpenseLedger />} />
          <Route path="income-categories" element={<IncomeCategories />} />
          <Route path="expense-categories" element={<ExpenseCategories />} />
          <Route path="reports" element={<Reports />} />
          <Route path="profit-loss" element={<ProfitLoss />} />
          <Route path="metrics" element={<DashboardMetrics />} />
        </Route>
        
        {/* Fallback routing temporarily */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
