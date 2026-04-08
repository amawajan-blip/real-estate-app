import React from 'react';
import { useDashboard } from '../hooks/useDatabase';
import { useApp } from '../contexts/AppContext';
import { StatCard, MiniBarChart, Breadcrumb, SkeletonRows, Icon } from '../components';

function timeAgo(dateStr, lang) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (lang === 'ar') {
    if (mins < 60) return `منذ ${mins} دقيقة`;
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    return `منذ ${days} يوم`;
  }
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
}

const activityIcons = {
  payment_recorded: '💳', tenant_added: '👤', tenant_removed: '👤',
  property_created: '🏠', contract_uploaded: '📄', default: '📋',
};

export default function DashboardPage({ t, lang }) {
  const { data, loading } = useDashboard();
  const { navigate, showToast } = useApp();
  const T = t.dashboard;

  const propStats = data?.propStats || {};
  const payStats  = data?.payStats  || [];
  const overdue   = data?.overdue   || [];
  const activity  = data?.recentActivity || [];

  const totalIncome = payStats.reduce((s, d) => s + (d.income || 0), 0);
  const totalExpenses = payStats.reduce((s, d) => s + (d.expenses || 0), 0);

  return (
    <div>
      <Breadcrumb items={[T.title]} />
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 4 }}>{T.welcome}, Ahmad 👋</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {lang === 'ar' ? 'إليك نظرة عامة على عقاراتك' : "Here's an overview of your properties"}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <StatCard label={T.totalIncome} value={`JD ${totalIncome.toLocaleString()}`} trend="up" trendLabel="+12%" iconBg="#EBF3FE" icon="💰" />
        <StatCard label={T.totalExpenses} value={`JD ${totalExpenses.toLocaleString()}`} trend="down" trendLabel="-3%" iconBg="#FEECEC" icon="📤" />
        <StatCard label={T.activeTeants} value={propStats.occupied_units || 0} trend="up" trendLabel="+2 new" iconBg="#E8F7EF" icon="👥" />
        <StatCard label={T.occupancyRate} value={`${propStats.occupancy_rate || 0}%`} trend="up" trendLabel="+5%" iconBg="#F3EEFE" icon="🏢" />
      </div>

      {/* Charts + Activity */}
      <div className="two-col">
        <div className="card">
          <div className="card-header"><span className="card-title">{T.monthlyOverview}</span></div>
          {loading ? <SkeletonRows count={2} /> : <MiniBarChart data={payStats} lang={lang} />}
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">{T.recentActivity}</span></div>
          {loading ? <SkeletonRows count={4} /> : (
            activity.length === 0
              ? <p style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>{lang === 'ar' ? 'لا يوجد نشاط' : 'No recent activity'}</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {activity.slice(0, 6).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ width: 30, height: 30, background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        {activityIcons[a.type] || activityIcons.default}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>{lang === 'ar' ? (a.message_ar || a.message) : a.message}</p>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{timeAgo(a.created_at, lang)}</p>
                      </div>
                    </div>
                  ))}
                </div>
          )}
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="card" style={{ marginBottom: 18, borderColor: '#f5b3b3' }}>
          <div className="card-header">
            <span className="card-title" style={{ color: 'var(--danger)' }}>⚠️ {T.overduePayments} ({overdue.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overdue.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--danger-light)', borderRadius: 8 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{p.tenant_name}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-secondary)' }}>{p.unit_number} · {p.date}</p>
                </div>
                <span style={{ fontWeight: 700, color: 'var(--danger)' }}>JD {p.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header"><span className="card-title">{T.quickActions}</span></div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {[
            { label: T.addProperty, icon: '🏠', page: 'properties' },
            { label: T.addTenant, icon: '👤', page: 'tenants' },
            { label: T.recordPayment, icon: '💳', page: 'payments' },
            { label: T.uploadContract, icon: '📄', page: 'contracts' },
          ].map((a, i) => (
            <button key={i} className="btn btn-secondary" onClick={() => navigate(a.page)} style={{ gap: 8 }}>
              <span style={{ fontSize: 16 }}>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
