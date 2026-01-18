

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useData } from './DataContext';
import type { User, Role } from '../types';

type AuthContextType = {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (userData: Omit<User, 'id' | 'password'> & {password: string}, invitationToken?: string) => Promise<boolean>;
  logout: () => void;
  sendPasswordResetLink: (email: string) => Promise<string | null>;
  resetPassword: (token: string, newPassword: string) => Promise<boolean>;
  can: (permission: string) => boolean;
  updateProfile: (data: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPermissions, setUserPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { findUserByEmail, addUser, setUserPasswordResetToken, findUserByPasswordResetToken, updateUserPassword, roles, updateUser } = useData();

  const can = useCallback((permission: string): boolean => {
    return userPermissions.has(permission);
  }, [userPermissions]);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('seafarm_monitor_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setCurrentUser(user);

        // Hydrate permissions on initial load
        if (roles.length > 0) {
            const role = roles.find(r => r.id === user.roleId);
            const permissions = role ? role.permissions : [];
            setUserPermissions(new Set(permissions));
        }
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('seafarm_monitor_user');
    } finally {
      setLoading(false);
    }
  }, [roles]); // Depend on roles being loaded from DataContext
  
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
      const user = findUserByEmail(email);
      if (user && user.password === password) {
          const role = roles.find(r => r.id === user.roleId);
          const permissions = role ? role.permissions : [];
          setUserPermissions(new Set(permissions));
          
          const { password: _, ...userToStore } = user;
          localStorage.setItem('seafarm_monitor_user', JSON.stringify(userToStore));
          setCurrentUser(userToStore);
          return true;
      }
      return false;
  }, [findUserByEmail, roles]);

  const signup = useCallback(async (userData: Omit<User, 'id' | 'password'> & {password: string}, invitationToken?: string): Promise<boolean> => {
      const newUser = addUser(userData, invitationToken);
      if(newUser) {
          const role = roles.find(r => r.id === newUser.roleId);
          const permissions = role ? role.permissions : [];
          setUserPermissions(new Set(permissions));

          const { password: _, ...userToStore } = newUser;
          localStorage.setItem('seafarm_monitor_user', JSON.stringify(userToStore));
          setCurrentUser(userToStore);
          return true;
      }
      return false;
  }, [addUser, roles]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setUserPermissions(new Set());
    localStorage.removeItem('seafarm_monitor_user');
  }, []);

  const sendPasswordResetLink = useCallback(async (email: string): Promise<string | null> => {
    const user = findUserByEmail(email);
    if (user) {
        const token = `mock-token-${Date.now()}`;
        const expires = new Date(Date.now() + 3600000); // 1 hour

        setUserPasswordResetToken(email, token, expires);

        const resetUrl = `${window.location.origin}${window.location.pathname}#/reset-password?token=${token}`;
        console.log('--- PASSWORD RESET (FOR TESTING) ---');
        console.log(`Reset link for ${email}: ${resetUrl}`);
        console.log('------------------------------------');
        return resetUrl;
    }
    return null;
  }, [findUserByEmail, setUserPasswordResetToken]);

  const resetPassword = useCallback(async (token: string, newPassword: string): Promise<boolean> => {
      const user = findUserByPasswordResetToken(token);
      if (!user) {
          return false;
      }
      const success = updateUserPassword(user.id, newPassword);
      if (success) {
          // Log user out after password reset for security
          logout();
      }
      return success;
  }, [findUserByPasswordResetToken, updateUserPassword, logout]);

  const updateProfile = useCallback((data: Partial<User>) => {
      if (!currentUser) return;

      const updatedUser = { ...currentUser, ...data };
      
      // 1. Update central data store (persistence across sessions)
      updateUser(updatedUser);
      
      // 2. Update current session state
      setCurrentUser(updatedUser);
      
      // 3. Update session storage
      localStorage.setItem('seafarm_monitor_user', JSON.stringify(updatedUser));
  }, [currentUser, updateUser]);

  const value = { currentUser, loading, login, signup, logout, sendPasswordResetLink, resetPassword, can, updateProfile };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};