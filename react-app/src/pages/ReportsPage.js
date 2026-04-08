import React, { useState } from 'react';
import { usePayments, useProperties, useTenants } from '../hooks/useDatabase';
import { Breadcrumb, StatCard, MiniBarChart, Icon } from '../components';

export default function ReportsPage({ t, lang }) {
  const { payments, loading: loadingPay } = usePayments();
  const { properties } = useProperties();
  const { tenants } = useTenants();
  const T = t.reports;
  const [activeTab, setTab] = useState('income');

  // Aggregate monthly data from real payments
  const monthlyMap = {};
  payments.forEach(p => {
    const m = (p.date||'').slice(0,7);
    if (!m) return;
    if (!monthlyMap[m]) monthlyMap[m] = { month:m, income:0, expenses:0 };
    if (p.status==='paid') {
      if (p.type==='rent') monthlyMap[m].income += p.amount;
      else                 monthlyMap[m].expenses += p.amount;
    }
  });
  const monthlyData = Object.values(monthlyMap).sort((a,b)=>a.month.localeCompare(b.month)).slice(-6);

  const totalIncome   = payments.filter(p=>p.status==='paid'&&p.type==='rent').reduce((s,p)=>s+p.amount,0);
  const totalExpenses = payments.filter(p=>p.status==='paid'&&p.type!=='rent').reduce((s,p)=>s+p.amount,0);
  const totalOverdue  = payments.filter(p=>p.status==='overdue').reduce((s,p)=>s+p.amount,0);
  const netIncome     = totalIncome - totalExpenses;

  const byType = {};
  payments.filter(p=>p.status==='paid').forEach(p => {
    byType[p.type] = (byType[p.type]||0) + p.amount;
  });

  const typeLabels = { rent:lang==='ar'?'إيجار':'Rent', electricity:lang==='ar'?'كهرباء':'Electricity', water:lang==='ar'?'ماء':'Water', tax:lang==='ar'?'ضريبة':'Tax' };
  const typeColors = { rent:'var(--accent)', electricity:'var(--warning)', water:'#1ABC9C', tax:'#9B59B6' };

  const tabs = [
    { key:'income',    label: T.incomeReport },
    { key:'occupancy', label: T.occupancyReport },
    { key:'payments',  label: T.expenseReport },
  ];

  return (
    <div>
      <Breadcrumb items={[T.title]} />
      <div className="page-header">
        <h2 className="page-title">{T.title}</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary btn-sm">📄 {T.exportPDF}</button>
          <button className="btn btn-secondary btn-sm">📊 {T.exportExcel}</button>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom:22 }}>
        <StatCard label={lang==='ar'?'إجمالي الدخل':'Total Income'}    value={`JD ${totalIncome.toLocaleString()}`}   trend="up"   trendLabel="+12%" iconBg="#EBF3FE" icon="💰" />
        <StatCard label={lang==='ar'?'إجمالي المصروفات':'Total Expenses'} value={`JD ${totalExpenses.toLocaleString()}`} trend="down" trendLabel="-5%"  iconBg="#FEECEC" icon="📤" />
        <StatCard label={lang==='ar'?'صافي الدخل':'Net Income'}        value={`JD ${netIncome.toLocaleString()}`}     trend="up"   trendLabel="+8%"  iconBg="#E8F7EF" icon="📈" />
        <StatCard label={lang==='ar'?'متأخرات':'Overdue'}              value={`JD ${totalOverdue.toLocaleString()}`}  trend="down" trendLabel="" iconBg="#FEECEC" icon="⚠️" />
      </div>

      {/* Tab row */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid var(--border)', marginBottom:18 }}>
        {tabs.map(tb=>(
          <button key={tb.key} onClick={()=>setTab(tb.key)}
            style={{ padding:'10px 18px', background:'none', border:'none', borderBottom:`2px solid ${activeTab===tb.key?'var(--accent)':'transparent'}`,
              color:activeTab===tb.key?'var(--accent)':'var(--text-secondary)', fontSize:13.5, fontWeight:activeTab===tb.key?600:400, cursor:'pointer', marginBottom:-1 }}>
            {tb.label}
          </button>
        ))}
      </div>

      {activeTab==='income' && (
        <div>
          <div className="card" style={{ marginBottom:18 }}>
            <div className="card-header"><span className="card-title">{T.incomeReport}</span></div>
            {loadingPay
              ? <div className="skeleton" style={{ height:120 }} />
              : monthlyData.length===0
                ? <p style={{ color:'var(--text-tertiary)', fontSize:13 }}>{lang==='ar'?'لا بيانات بعد':'No data yet'}</p>
                : <MiniBarChart data={monthlyData} lang={lang} />
            }
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">{lang==='ar'?'توزيع حسب النوع':'By Payment Type'}</span></div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {Object.entries(byType).map(([type,amount]) => {
                const total = Object.values(byType).reduce((s,v)=>s+v,0);
                const pct   = total>0 ? Math.round((amount/total)*100) : 0;
                return (
                  <div key={type}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5, fontSize:13 }}>
                      <span style={{ fontWeight:500 }}>{typeLabels[type]||type}</span>
                      <span style={{ fontWeight:600 }}>JD {amount.toLocaleString()} <span style={{ color:'var(--text-tertiary)', fontWeight:400 }}>({pct}%)</span></span>
                    </div>
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width:`${pct}%`, background:typeColors[type]||'var(--accent)' }} />
                    </div>
                  </div>
                );
              })}
              {Object.keys(byType).length===0 && <p style={{ color:'var(--text-tertiary)', fontSize:13 }}>{lang==='ar'?'لا بيانات':'No data'}</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab==='occupancy' && (
        <div className="card">
          <div className="card-header"><span className="card-title">{T.occupancyReport}</span></div>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {properties.map(p => {
              const pct = p.total_units>0 ? Math.round((p.occupied_units/p.total_units)*100) : 0;
              return (
                <div key={p.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                    <span style={{ fontWeight:500 }}>{p.name}</span>
                    <span style={{ fontWeight:600 }}>{pct}% <span style={{ color:'var(--text-tertiary)', fontWeight:400 }}>({p.occupied_units||0}/{p.total_units||0})</span></span>
                  </div>
                  <div className="progress-track">
                    <div className={`progress-fill ${pct>=80?'green':pct>=50?'':'orange'}`} style={{ width:`${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {properties.length===0 && <p style={{ color:'var(--text-tertiary)', fontSize:13 }}>{lang==='ar'?'لا توجد عقارات':'No properties'}</p>}
          </div>
        </div>
      )}

      {activeTab==='payments' && (
        <div className="card">
          <div className="card-header"><span className="card-title">{lang==='ar'?'آخر المدفوعات':'Recent Payments'}</span></div>
          <table className="data-table">
            <thead><tr>
              <th>{lang==='ar'?'المستأجر':'Tenant'}</th>
              <th>{lang==='ar'?'المبلغ':'Amount'}</th>
              <th>{lang==='ar'?'النوع':'Type'}</th>
              <th>{lang==='ar'?'التاريخ':'Date'}</th>
              <th>{lang==='ar'?'الحالة':'Status'}</th>
            </tr></thead>
            <tbody>
              {payments.slice(0,15).map(p=>(
                <tr key={p.id}>
                  <td style={{ fontWeight:500 }}>{p.tenant_name}</td>
                  <td style={{ fontWeight:700 }}>JD {p.amount}</td>
                  <td style={{ textTransform:'capitalize', color:'var(--text-secondary)' }}>{p.type}</td>
                  <td style={{ color:'var(--text-secondary)' }}>{p.date}</td>
                  <td>
                    <span style={{
                      background: p.status==='paid'?'var(--success-light)':p.status==='overdue'?'var(--danger-light)':'var(--warning-light)',
                      color:      p.status==='paid'?'#155a30':p.status==='overdue'?'#8b1a1a':'#7a4a00',
                      borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:500,
                    }}>{p.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
