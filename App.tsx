
import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { LoginView } from './views/LoginView';
import { SheikhDashboard } from './views/SheikhDashboard';
import { StudentDashboard } from './views/StudentDashboard';
import { PendingApprovalView } from './views/PendingApprovalView';
import { UserRole, UserStatus } from './types';

const MainContent: React.FC = () => {
  const { auth, language } = useApp();

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  if (auth.isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-primary-600">Loading...</div>;
  }

  if (!auth.isAuthenticated) {
    return <LoginView />;
  }

  // If User is Pending, show Pending Screen (unless it's Sheikh, who is always active)
  if (auth.user?.status === UserStatus.PENDING && auth.user.role !== UserRole.SHEIKH) {
    return <PendingApprovalView />;
  }

  return (
    <Layout>
      {auth.user?.role === UserRole.SHEIKH ? (
        <SheikhDashboard />
      ) : (
        <StudentDashboard />
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  );
};

export default App;
