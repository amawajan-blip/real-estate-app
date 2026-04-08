import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/electronService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [theme, setTheme] = useState('light');
  const [activePage, setActivePage] = useState('dashboard');
  const [toasts, setToasts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    (async () => {
      try {
        const savedLang = await api.store.get('language');
        const savedTheme = await api.store.get('theme');
        if (savedLang) setLang(savedLang);
        if (savedTheme) setTheme(savedTheme);
      } catch { /* ignore */ }
    })();

    // Listen for navigation events from main process menu
    api.on('navigate', (page) => setActivePage(page));
    api.on('toast', ({ message, type }) => showToast(message, type));

    return () => {
      api.off('navigate');
      api.off('toast');
    };
  }, []); // eslint-disable-line

  const navigate = useCallback((page) => {
    setActivePage(page);
    setSidebarOpen(false);
  }, []);

  const toggleLang = useCallback(async () => {
    const newLang = lang === 'en' ? 'ar' : 'en';
    setLang(newLang);
    await api.store.set('language', newLang);
    await api.app.rebuildMenu();
  }, [lang]);

  const toggleTheme = useCallback(async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    await api.store.set('theme', newTheme);
  }, [theme]);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <AppContext.Provider value={{
      lang, toggleLang,
      theme, toggleTheme,
      activePage, navigate,
      toasts, showToast, dismissToast,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
