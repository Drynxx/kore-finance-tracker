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

// Wrapper component to handle auth state
const AppContent = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (loading) return null; // Or a loading spinner

  if (!user) {
    return (
      <WallpaperProvider>
        <NatureBackground />
        <AuthScreens />
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

