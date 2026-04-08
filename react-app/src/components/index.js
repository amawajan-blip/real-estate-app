import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import api from '../services/electronService';
import translations from '../i18n/translations';

// ─── SVG Icons ────────────────────────────────────────────────────────────────
export const Icon = {
  Dashboard: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Properties: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>,
  Tenants: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Payments: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Contracts: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Reports: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  Settings: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  Menu: () => <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Close: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Plus: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Bell: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  ChevronDown: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>,
  Globe: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  Eye: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Edit: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  Upload: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  TrendUp: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  TrendDown: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>,
  Moon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
  Sun: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export function Sidebar({ t }) {
  const { activePage, navigate, sidebarOpen } = useApp();
  const navItems = [
    { key: 'dashboard',  label: t.nav.dashboard,  Icon: Icon.Dashboard },
    { key: 'properties', label: t.nav.properties, Icon: Icon.Properties },
    { key: 'tenants',    label: t.nav.tenants,    Icon: Icon.Tenants },
    { key: 'payments',   label: t.nav.payments,   Icon: Icon.Payments },
    { key: 'contracts',  label: t.nav.contracts,  Icon: Icon.Contracts },
    { key: 'reports',    label: t.nav.reports,    Icon: Icon.Reports },
    { key: 'settings',   label: t.nav.settings,   Icon: Icon.Settings },
  ];
  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🏛</div>
        <div className="sidebar-logo-text">
          <p className="brand">{t.appName}</p>
          <p className="brand-sub">{t.appNameAr}</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(({ key, label, Icon: NavIcon }) => (
          <button key={key} className={`nav-item ${activePage === key ? 'active' : ''}`} onClick={() => navigate(key)}>
            <span className="nav-icon"><NavIcon /></span>
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="user-avatar">AH</div>
        <div className="user-info">
          <div className="name">Ahmad Al-Hassan</div>
          <div className="role">{t.lang === 'ar' ? 'مالك عقار' : 'Property Owner'}</div>
        </div>
      </div>
    </aside>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
export function Header({ t }) {
  const { lang, toggleLang, theme, toggleTheme, activePage, navigate, setSidebarOpen } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <header className="header">
      <div className="header-left">
        <button className="icon-btn" onClick={() => setSidebarOpen(o => !o)}><Icon.Menu /></button>
        <span className="header-title">{t.nav[activePage] || activePage}</span>
      </div>
      <div className="header-right">
        <button className="lang-btn" onClick={toggleLang}>
          <Icon.Globe />{lang === 'en' ? 'عربي' : 'EN'}
        </button>
        <button className="icon-btn" onClick={toggleTheme}>
          {theme === 'dark' ? <Icon.Sun /> : <Icon.Moon />}
        </button>
        <div className="notif-btn">
          <button className="icon-btn"><Icon.Bell /><span className="notif-dot"/></button>
        </div>
        <div className="profile-wrap">
          <button className="profile-btn" onClick={() => setProfileOpen(o => !o)}>
            <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 10 }}>AH</div>
            <Icon.ChevronDown />
          </button>
          {profileOpen && (
            <div className="profile-dropdown" onClick={() => setProfileOpen(false)}>
              <div className="profile-dropdown-header">
                <div className="name">Ahmad Al-Hassan</div>
                <div className="email">ahmad@realestate.com</div>
              </div>
              <button className="profile-dropdown-item" onClick={() => navigate('settings')}>{t.nav.settings}</button>
              <button className="profile-dropdown-item" onClick={() => api.db.export()}>{t.settings?.exportDb || 'Export DB'}</button>
              <button className="profile-dropdown-item danger" onClick={() => api.app.close()}>{lang === 'ar' ? 'خروج' : 'Quit App'}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Toast Container ──────────────────────────────────────────────────────────
export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span>{toast.message}</span>
          <button className="toast-close" onClick={() => onDismiss(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="icon-btn" onClick={onClose}><Icon.Close /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
export function FormField({ label, required, children }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}{required && <span className="required"> *</span>}</label>}
      {children}
    </div>
  );
}

export function Input({ value, onChange, type = 'text', placeholder, required, disabled, className = '' }) {
  return (
    <input
      type={type} value={value || ''} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required} disabled={disabled}
      className={`form-control ${className}`}
    />
  );
}

export function Select({ value, onChange, options = [], placeholder, disabled }) {
  return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} disabled={disabled} className="form-control">
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return <textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="form-control" />;
}

// ─── Breadcrumb ───────────────────────────────────────────────────────────────
export function Breadcrumb({ items }) {
  return (
    <div className="breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span className="breadcrumb-sep">/</span>}
          <span className={i === items.length - 1 ? 'breadcrumb-current' : ''}>{item}</span>
        </span>
      ))}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ status, label }) {
  const map = {
    paid: 'paid', overdue: 'overdue', pending: 'pending',
    active: 'active', expired: 'expired', expiring_soon: 'expiring_soon',
    blue: 'blue', gray: 'gray',
  };
  return <span className={`badge badge-${map[status] || 'gray'}`}>{label}</span>;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, trend, trendLabel, iconBg, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        <div className="stat-icon" style={{ background: iconBg }}>{icon}</div>
      </div>
      <div>
        <div className="stat-value">{value}</div>
        {trendLabel && (
          <div className={`stat-trend ${trend}`}>
            {trend === 'up' ? <Icon.TrendUp /> : <Icon.TrendDown />}
            {trendLabel}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading Skeletons ────────────────────────────────────────────────────────
export function SkeletonRows({ count = 4 }) {
  return (
    <div style={{ padding: '12px 16px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, desc, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <h4>{title}</h4>
      <p>{desc}</p>
      {actionLabel && <button className="btn btn-primary" onClick={onAction}><Icon.Plus />{actionLabel}</button>}
    </div>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────
export function Tabs({ tabs, activeTab, onTab }) {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button key={tab.key} className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`} onClick={() => onTab(tab.key)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────
export function Pagination({ total, page, perPage, onPage }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div className="pagination">
      <span className="pagination-info">{total} total</span>
      <div className="pagination-pages">
        {Array.from({ length: pages }).map((_, i) => (
          <button key={i} className={`page-btn ${page === i + 1 ? 'active' : ''}`} onClick={() => onPage(i + 1)}>
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── File Uploader ────────────────────────────────────────────────────────────
export function FileUploader({ lang, onFileSelected, fileName: externalFile }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(externalFile || null);
  const isAr = lang === 'ar';

  const handleSelect = async () => {
    const filePath = await api.fs.selectFile();
    if (filePath) {
      const name = filePath.split(/[/\\]/).pop();
      setFileName(name);
      if (onFileSelected) onFileSelected(filePath, name);
    }
  };

  return (
    <div
      className={`file-uploader ${dragging ? 'dragging' : ''} ${fileName ? 'has-file' : ''}`}
      onClick={handleSelect}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
    >
      <div className="upload-icon">{fileName ? '✅' : '📎'}</div>
      <p>{fileName || (isAr ? 'انقر لاختيار ملف' : 'Click to select file')}</p>
      <small>{isAr ? 'PDF, PNG, JPG, DOCX' : 'PDF, PNG, JPG, DOCX supported'}</small>
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 34, bg = 'var(--accent-light)', color = 'var(--accent-dark)' }) {
  const initials = (name || 'XX').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.32, color, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
export function MiniBarChart({ data = [], lang }) {
  const monthNames = translations[lang || 'en'].common;
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const maxVal = Math.max(...data.map(d => Math.max(d.income || 0, d.expenses || 0)), 1);

  return (
    <div>
      <div className="bar-chart">
        {data.map((d, i) => (
          <div key={i} className="bar-group">
            <div className="bar income" style={{ height: `${Math.max((d.income / maxVal) * 100, 4)}%` }} />
            <div className="bar expenses" style={{ height: `${Math.max((d.expenses / maxVal) * 100, 4)}%` }} />
          </div>
        ))}
      </div>
      <div className="chart-labels">
        {data.map((d, i) => {
          const monthKey = d.month ? months[parseInt(d.month.split('-')[1]) - 1] : months[i];
          return <span key={i} className="chart-label">{monthNames[monthKey] || d.month}</span>;
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, background: 'var(--accent)', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lang === 'ar' ? 'دخل' : 'Income'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 8, height: 8, background: 'var(--danger)', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lang === 'ar' ? 'مصروف' : 'Expenses'}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
export function ConfirmModal({ isOpen, onClose, onConfirm, title, message, t }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || (t?.common?.confirm || 'Confirm')}
      footer={<>
        <button className="btn btn-secondary" onClick={onClose}>{t?.common?.cancel || 'Cancel'}</button>
        <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>{t?.common?.delete || 'Delete'}</button>
      </>}
    >
      <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{message}</p>
    </Modal>
  );
}
