import React, { useState } from 'react';
import { TransactionProvider } from './context/TransactionContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { TransactionList } from './components/TransactionList';
import { AddTransactionModal } from './components/AddTransactionModal';
import { AuthScreens } from './components/AuthScreens';
import { NatureBackground } from './components/NatureBackground';

import { WallpaperProvider } from './context/WallpaperContext';

import { VerificationPending } from './components/VerificationPending';

import { ResetPassword } from './components/ResetPassword';

// Wrapper component to handle auth state
const AppContent = () => {
  const { user, loading, completeVerification } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resetParams, setResetParams] = useState(null);

  // Handle Verification & Password Reset Callbacks
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');
    const secret = params.get('secret');
    const type = params.get('type');

    if (userId && secret) {
      if (type === 'recovery') {
        // Password Reset Mode
        setResetParams({ userId, secret });
      } else {
        // Email Verification Mode
        setVerifying(true);
        completeVerification(userId, secret)
          .then(() => {
            // Clear URL params
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .finally(() => setVerifying(false));
      }
    }
  }, []);

  if (resetParams) {
    return (
      <ResetPassword
        userId={resetParams.userId}
        secret={resetParams.secret}
        onComplete={() => {
          setResetParams(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  if (loading || verifying) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) {
    return (
      <WallpaperProvider>
        <NatureBackground />
        <AuthScreens />
      </WallpaperProvider>
    );
  }

  // Enforce Email Verification
  if (!user.emailVerification) {
    return (
      <WallpaperProvider>
        <VerificationPending />
      </WallpaperProvider>
    );
  }

  return (
    <WallpaperProvider>
      <CurrencyProvider>
        <TransactionProvider>
          <NatureBackground />
          <Layout activeTab={activeTab} setActiveTab={setActiveTab} onOpenAddModal={() => setIsModalOpen(true)}>
            <main className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' ? (
                <Dashboard />
              ) : (
                <TransactionList />
              )}
            </main>

            {isModalOpen && (
              <AddTransactionModal onClose={() => setIsModalOpen(false)} />
            )}
          </Layout>
        </TransactionProvider>
      </CurrencyProvider>
    </WallpaperProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

