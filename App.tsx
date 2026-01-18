
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import { LocalizationProvider } from './contexts/LocalizationContext';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { AuthProvider } from './contexts/AuthContext';
import { PERMISSIONS } from './permissions';

import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/auth/ProtectedRoute';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import SiteManagement from './pages/SiteManagement';
import FarmerCredits from './pages/FarmerCredits';
import SeaweedTypeManagement from './pages/SeaweedTypeManagement';
import { ModuleTracking } from './pages/ModuleTracking';
import CultivationCycle from './pages/CultivationCycle';
import HarvestProcessing from './pages/HarvestProcessing';
import DryingPage from './pages/DryingPage';
import BaggingPage from './pages/BaggingPage';
import StockManagement from './inventory/on-site-storage';
import FarmerManagement from './pages/FarmerManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import PressedWarehouse from './inventory/pressed-warehouse';
import Exports from './pages/Exports';
import ServiceProviders from './pages/ServiceProviders';
import FarmerDeliveries from './inventory/farmer-deliveries';
import CuttingOperations from './pages/CuttingOperations';
import SiteTransfers from './pages/SiteTransfers';
import IncidentManagement from './pages/IncidentManagement';
import IncidentTypeManagement from './pages/IncidentTypeManagement';
import IncidentSeverityManagement from './pages/IncidentSeverityManagement';
import DocumentPayments from './pages/DocumentPayments';
import PeriodicTests from './pages/PeriodicTests';
import FarmMap from './pages/FarmMap';
import RoleManagement from './pages/RoleManagement';
import PayrollCalculator from './pages/PayrollCalculator';
import SiteCultivationCycles from './pages/SiteCultivationCycles';
import SeaweedTypeCultivationCycles from './pages/SeaweedTypeCultivationCycles';
import UserManual from './pages/UserManual';
import OperationalCalendar from './pages/OperationalCalendar';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import TermsOfUse from './pages/TermsOfUse';

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <LocalizationProvider>
        <DataProvider>
          <NotificationProvider>
            <AuthProvider>
              <AppRouter />
            </AuthProvider>
          </NotificationProvider>
        </DataProvider>
      </LocalizationProvider>
    </SettingsProvider>
  );
};

const AppRouter: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<TermsOfUse />} />
        
        <Route element={<MainLayout />}>
          <Route element={<ProtectedRoute permission={PERMISSIONS.DASHBOARD_VIEW} />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          <Route element={<ProtectedRoute />}>
             <Route path="/profile" element={<UserProfile />} />
          </Route>

          <Route element={<ProtectedRoute permission={PERMISSIONS.SETTINGS_VIEW} />}>
            <Route path="/settings" element={<Navigate to="/settings/general" />} />
            <Route path="/settings/general" element={<Settings />} />
            <Route path="/settings/users" element={<UserManagement />} />
            <Route path="/settings/roles" element={<RoleManagement />} />
            <Route path="/settings/incident-types" element={<IncidentTypeManagement />} />
            <Route path="/settings/incident-severities" element={<IncidentSeverityManagement />} />
          </Route>

          <Route element={<ProtectedRoute permission={PERMISSIONS.OPERATIONS_VIEW} />}>
            <Route path="/sites" element={<SiteManagement />} />
            <Route path="/sites/:siteId/cultivation" element={<SiteCultivationCycles />} />
            <Route path="/seaweed-types" element={<SeaweedTypeManagement />} />
            <Route path="/seaweed-types/:typeId/cultivation" element={<SeaweedTypeCultivationCycles />} />
            <Route path="/modules" element={<ModuleTracking />} />
            <Route path="/operations/cutting" element={<CuttingOperations />} />
            <Route path="/operations/map" element={<FarmMap />} />
            <Route path="/operations/calendar" element={<OperationalCalendar />} />
            <Route path="/cultivation" element={<CultivationCycle />} />
            <Route path="/harvesting" element={<HarvestProcessing />} />
            <Route path="/drying" element={<DryingPage />} />
            <Route path="/bagging" element={<BaggingPage />} />
          </Route>
          
          <Route element={<ProtectedRoute permission={PERMISSIONS.INVENTORY_VIEW} />}>
            <Route path="/inventory/on-site-storage" element={<StockManagement />} />
            <Route path="/inventory/farmer-deliveries" element={<FarmerDeliveries />} />
            <Route path="/inventory/site-transfers" element={<SiteTransfers />} />
            <Route path="/inventory/pressed-warehouse" element={<PressedWarehouse />} />
            <Route path="/exports" element={<Exports />} />
          </Route>

          <Route element={<ProtectedRoute permission={PERMISSIONS.STAKEHOLDERS_VIEW} />}>
            <Route path="/farmers" element={<FarmerManagement />} />
            <Route path="/employees" element={<EmployeeManagement />} />
            <Route path="/providers" element={<ServiceProviders />} />
            <Route path="/farmer-credits" element={<FarmerCredits />} />
            <Route path="/document-payments" element={<DocumentPayments />} />
            <Route path="/payroll-calculator" element={<PayrollCalculator />} />
          </Route>

          <Route element={<ProtectedRoute permission={PERMISSIONS.MONITORING_VIEW} />}>
            <Route path="/monitoring/incidents" element={<IncidentManagement />} />
            <Route path="/monitoring/tests" element={<PeriodicTests />} />
          </Route>
          
          <Route element={<ProtectedRoute permission={PERMISSIONS.REPORTS_VIEW} />}>
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* User manual is always accessible for logged-in users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/manual" element={<UserManual />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
