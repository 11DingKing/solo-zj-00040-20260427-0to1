import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { UserRole } from '@/types';
import Login from '@/pages/Login';
import MainLayout from '@/layouts/MainLayout';
import Dashboard from '@/pages/Dashboard';
import ScheduleWeekView from '@/pages/ScheduleWeekView';
import StoreManagement from '@/pages/StoreManagement';
import EmployeeManagement from '@/pages/EmployeeManagement';
import EmployeeView from '@/pages/EmployeeView';
import Attendance from '@/pages/Attendance';
import SalaryManagement from '@/pages/SalaryManagement';
import SwapRequests from '@/pages/SwapRequests';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (!storedToken || !storedUser) {
        navigate('/login');
      }
    }
  }, [isAuthenticated, token, navigate]);

  if (!isAuthenticated && !localStorage.getItem('token')) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const RoleBasedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: UserRole[];
}> = ({ children, allowedRoles }) => {
  const { user, setUser } = useAuthStore();

  if (!user) {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // 更新 store 中的用户状态
      setUser(parsedUser as IUser);
      if (allowedRoles.includes(parsedUser.role)) {
        return <>{children}</>;
      }
    }
    return <Navigate to="/dashboard" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route
        path="/*"
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="schedule" element={
          <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
            <ScheduleWeekView />
          </RoleBasedRoute>
        } />
        <Route path="stores" element={
          <RoleBasedRoute allowedRoles={[UserRole.ADMIN]}>
            <StoreManagement />
          </RoleBasedRoute>
        } />
        <Route path="employees" element={
          <RoleBasedRoute allowedRoles={[UserRole.ADMIN, UserRole.MANAGER]}>
            <EmployeeManagement />
          </RoleBasedRoute>
        } />
        <Route path="my-schedule" element={
          <RoleBasedRoute allowedRoles={[UserRole.EMPLOYEE]}>
            <EmployeeView />
          </RoleBasedRoute>
        } />
        <Route path="attendance" element={<Attendance />} />
        <Route path="salary" element={<SalaryManagement />} />
        <Route path="swap-requests" element={
          <RoleBasedRoute allowedRoles={[UserRole.EMPLOYEE, UserRole.MANAGER, UserRole.ADMIN]}>
            <SwapRequests />
          </RoleBasedRoute>
        } />
        <Route path="" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
