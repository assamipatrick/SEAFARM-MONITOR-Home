import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthorizationProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const Authorization: React.FC<AuthorizationProps> = ({ permission, children, fallback = null }) => {
  const { can } = useAuth();

  return can(permission) ? <>{children}</> : <>{fallback}</>;
};

export default Authorization;
