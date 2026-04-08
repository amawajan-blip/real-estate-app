import React, { useEffect } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import translations from './i18n/translations';
import DashboardPage   from './pages/DashboardPage';
import PropertiesPage  from './pages/PropertiesPage';
import TenantsPage     from './pages/TenantsPage';
import PaymentsPage    from './pages/PaymentsPage';
import ContractsPage   from './pages/ContractsPage';
import ReportsPage     from './pages/ReportsPage';
import SettingsPage    from './pages/SettingsPage';
import { Sidebar, Header, ToastContainer } from './components';
import './App.css';

const pages = {
  dashboard:  DashboardPage,
  properties: PropertiesPage,
  tenants:    TenantsPage,
  payments:   PaymentsPage,
  contracts:  ContractsPage,
  reports:    ReportsPage,
  settings:   SettingsPage,
};

function AppInner() {
  const { lang, theme, activePage, sidebarOpen, setSidebarOpen, toasts, dismissToast } = useApp();
  const t   = translations[lang];
  const isRTL = lang === 'ar';
  const PageComponent = pages[activePage] || DashboardPage;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
    document.documentElement.lang = lang;
  }, [theme, isRTL, lang]);

  return (
    <div className={`app-shell ${theme} ${isRTL ? 'rtl' : 'ltr'}`}>
      <Sidebar t={t} />
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <div className="main-area">
        <Header t={t} />
        <main className="page-content">
          <PageComponent t={t} lang={lang} />
        </main>
      </div>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
