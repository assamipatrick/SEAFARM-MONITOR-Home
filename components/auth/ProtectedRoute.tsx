import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  permission?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ permission }) => {
  const { currentUser, can } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  if (permission && !can(permission)) {
    // User is logged in but doesn't have the required permission
    // Redirect to a safe page, like the dashboard
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};

export default ProtectedRoute;
