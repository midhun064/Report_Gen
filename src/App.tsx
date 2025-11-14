import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FormProvider } from './context/FormContext';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboards/Dashboard';
import ManagerDashboard from './components/Dashboards/ManagerDashboard';
import HRDashboard from './components/Dashboards/HRDashboard';
import ITSupportDashboard from './components/Dashboards/ITSupportDashboard';
import FacilitiesDeskDashboard from './components/Dashboards/FacilitiesDeskDashboard';
import FacilitiesManagerDashboard from './components/Dashboards/FacilitiesManagerDashboard';
import FinanceOfficerDashboard from './components/Dashboards/FinanceOfficerDashboard';
import LegalStaffDashboard from './components/Dashboards/LegalStaffDashboard';
import UnifiedFormNotification from './components/Notifications/UnifiedFormNotification';

// Error Boundary Component
class AuthErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Auth Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Error</h1>
            <p className="text-gray-600 mb-4">There was an issue with the authentication system.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const DashboardRouter: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    console.log('DashboardRouter: No user found, returning null');
    return null;
  }

  const isManager =
    user.role === 'Department Manager' ||
    user.role === 'Team Lead' ||
    user.user_type === 'line_manager';

  const isHR =
    user.role === 'HR Manager' ||
    user.role === 'HR' ||
    user.role === 'HR Officer' ||
    user.role === 'HR Staff' ||
    user.user_type === 'hr_staff';

  const isITSupport =
    user.role === 'IT Support' ||
    user.role === 'IT Support Officer' ||
    user.role === 'IT Staff' ||
    user.user_type === 'it_staff';

  const isFacilitiesDesk =
    user.role === 'Facilities Desk Coordinator' ||
    user.role === 'Facilities Officer' ||
    user.role === 'Facilities Staff' ||
    user.user_type === 'facilities_staff';
  
  const isFacilitiesManager =
    user.role === 'Facilities Manager' ||
    user.role === 'Facilities Director' ||
    user.user_type === 'facilities_manager';

  const isFinanceOfficer =
    user.role === 'Finance Officer' ||
    user.role === 'Finance Staff' ||
    user.user_type === 'finance_staff';

  const isLegalStaff =
    user.role === 'Legal Staff' ||
    user.role === 'Legal Officer' ||
    user.user_type === 'legal_staff';

  if (isLegalStaff) {
    return <LegalStaffDashboard />;
  }

  if (isITSupport) {
    return <ITSupportDashboard />;
  }

  if (isHR) {
    return <HRDashboard />;
  }

  if (isFinanceOfficer) {
    return <FinanceOfficerDashboard />;
  }

  if (isFacilitiesManager) {
    return <FacilitiesManagerDashboard />;
  }

  if (isFacilitiesDesk) {
    return <FacilitiesDeskDashboard />;
  }

  return isManager ? (
    <ManagerDashboard />
  ) : (
    <Dashboard />
  );
};

const AppContent: React.FC = () => {
  const authContext = useAuth();
  
  // Defensive check for auth context
  if (!authContext) {
    console.error('AppContent: Auth context is null');
    return <LoginForm />;
  }
  
  const { 
    isAuthenticated,
    formNotifications,
    showFormNotifications,
    dismissFormNotifications,
    markNotificationAsRead
  } = authContext;


  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      <main className="pt-4">
        <DashboardRouter />
      </main>
      
      {/* Unified Form State Notifications */}
      {showFormNotifications && formNotifications.length > 0 && (
        <UnifiedFormNotification
          notifications={formNotifications}
          onClose={dismissFormNotifications}
          onMarkRead={markNotificationAsRead}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <FormProvider>
        <AuthErrorBoundary>
          <AppContent />
        </AuthErrorBoundary>
      </FormProvider>
    </AuthProvider>
  );
}

export default App;