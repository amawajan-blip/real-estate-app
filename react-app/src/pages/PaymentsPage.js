import React, { useState } from 'react';
import { usePayments, useTenants } from '../hooks/useDatabase';
import { useApp } from '../contexts/AppContext';
import {
  Breadcrumb, Modal, FormField, Input, Select, Textarea,
  EmptyState, SkeletonRows, ConfirmModal, Pagination, Badge, Icon
} from '../components';

const TYPE_COLORS = {
  rent:        { bg:'#EBF3FE', color:'#1558C0' },
  electricity: { bg:'#FFF3DC', color:'#7a4a00' },
  water:       { bg:'#E1F5EE', color:'#0f6e56' },
  tax:         { bg:'#F3EEFE', color:'#6c35b5' },
};

export default function PaymentsPage({ t, lang }) {
  const { payments, loading, createPayment, updatePayment, deletePayment } = usePayments();
  const { tenants } = useTenants();
  const { showToast } = useApp();
  const T = t.payments;

  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState('all');
  const [page, setPage]       = useState(1);
  const [modal, setModal]     = useState(false);
  const [editTarget, setEdit] = useState(null);
  const [delTarget, setDel]   = useState(null);
  const [saving, setSaving]   = useState(false);

  const today = new Date().toISOString().slice(0,10);
  const empty = { tenant_id:'', amount:'', type:'rent', status:'paid', date:today, due_date:'', notes:'' };
  const [form, setForm] = useState(empty);
  const upd = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const openAdd  = () => { setForm(empty); setEdit(null); setModal(true); };
  const openEdit = (p) => {
    setForm({ tenant_id:String(p.tenant_id||''), amount:String(p.amount||''),
      type:p.type||'rent', status:p.status||'paid',
      date:p.date||today, due_date:p.due_date||'', notes:p.notes||'' });
    setEdit(p); setModal(true);
  };

  const handleSave = async () => {
    if (!form.tenant_id) { showToast(lang==='ar'?'اختر مستأجراً':'Select a tenant','error'); return; }
    if (!form.amount || isNaN(Number(form.amount))) { showToast(lang==='ar'?'المبلغ غير صحيح':'Invalid amount','error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, tenant_id:Number(form.tenant_id), amount:Number(form.amount) };
      if (editTarget) { await updatePayment(editTarget.id, payload); showToast(t.messages.changesSaved,'success'); }
      else            { await createPayment(payload);               showToast(t.messages.paymentRecorded,'success'); }
      setModal(false);
    } catch(e) { showToast(e.message||'Error','error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await deletePayment(delTarget.id); showToast(lang==='ar'?'تم الحذف':'Deleted','success'); }
    catch(e) { showToast(e.message,'error'); }
  };

  const perPage = 10;
  const filtered = payments.filter(p => {
    const q = search.toLowerCase();
    return ((p.tenant_name||'').toLowerCase().includes(q) || (p.property_name||'').toLowerCase().includes(q))
      && (filter==='all' || p.status===filter);
  });
  const paged = filtered.slice((page-1)*perPage, page*perPage);

  const totalPaid    = payments.filter(p=>p.status==='paid').reduce((s,p)=>s+p.amount,0);
  const totalOverdue = payments.filter(p=>p.status==='overdue').reduce((s,p)=>s+p.amount,0);
  const totalPending = payments.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0);

  const tenantOpts = tenants.map(tn => ({ value:tn.id, label:tn.name }));
  const typeOpts   = [
    { value:'rent',        label:lang==='ar'?'إيجار':'Rent' },
    { value:'electricity', label:lang==='ar'?'كهرباء':'Electricity' },
    { value:'water',       label:lang==='ar'?'ماء':'Water' },
    { value:'tax',         label:lang==='ar'?'ضريبة':'Tax' },
  ];
  const statusOpts = [
    { value:'paid',    label:T.paid },
    { value:'overdue', label:T.overdue },
    { value:'pending', label:T.pending },
  ];

  return (
    <div>
      <Breadcrumb items={[T.title]} />
      <div className="page-header">
        <h2 className="page-title">{T.title}</h2>
        <button className="btn btn-primary" onClick={openAdd}><Icon.Plus />{T.addNew}</button>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:18 }}>
        {[
          { label:T.paid,    value:`JD ${totalPaid.toLocaleString()}`,    bg:'var(--success-light)', color:'#155a30' },
          { label:T.overdue, value:`JD ${totalOverdue.toLocaleString()}`, bg:'var(--danger-light)',  color:'#8b1a1a' },
          { label:T.pending, value:`JD ${totalPending.toLocaleString()}`, bg:'var(--warning-light)', color:'#7a4a00' },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:'12px 16px' }}>
            <div style={{ fontSize:11, fontWeight:600, color:s.color, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.4px' }}>{s.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="search-wrap" style={{ flex:1 }}>
            <span className="search-icon"><Icon.Search /></span>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
              placeholder={T.search} className="form-control search-input" />
          </div>
        </div>
        <div className="toolbar-right">
          <select value={filter} onChange={e=>{ setFilter(e.target.value); setPage(1); }} className="form-control" style={{ width:'auto' }}>
            <option value="all">{t.common.all}</option>
            {statusOpts.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="table-wrap">
        {loading ? <SkeletonRows count={5} /> : paged.length===0 ? (
          <EmptyState icon="💳" title={lang==='ar'?'لا توجد مدفوعات':'No payments found'}
            desc={lang==='ar'?'سجّل أول دفعة':'Record your first payment'}
            actionLabel={T.addNew} onAction={openAdd} />
        ) : (
          <table className="data-table">
            <thead><tr>
              <th>{T.tenant}</th>
              <th>{lang==='ar'?'العقار':'Property'}</th>
              <th>{T.amount}</th>
              <th>{T.type}</th>
              <th>{T.date}</th>
              <th>{T.status}</th>
              <th></th>
            </tr></thead>
            <tbody>
              {paged.map(p => {
                const tc = TYPE_COLORS[p.type]||TYPE_COLORS.rent;
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight:500, fontSize:13.5 }}>{p.tenant_name}</div>
                      <div style={{ fontSize:11.5, color:'var(--text-tertiary)' }}>{p.unit_number}</div>
                    </td>
                    <td style={{ color:'var(--text-secondary)', fontSize:13 }}>{p.property_name||'—'}</td>
                    <td style={{ fontWeight:700, fontSize:15 }}>JD {p.amount}</td>
                    <td><span style={{ background:tc.bg, color:tc.color, borderRadius:6, padding:'3px 10px', fontSize:11.5, fontWeight:500, textTransform:'capitalize' }}>{p.type}</span></td>
                    <td style={{ fontSize:13, color:'var(--text-secondary)' }}>{p.date}</td>
                    <td><Badge status={p.status} label={T[p.status]||p.status} /></td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(p)}><Icon.Edit /></button>
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color:'var(--danger)' }} onClick={()=>setDel(p)}><Icon.Trash /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} />
      </div>

      <Modal isOpen={modal} onClose={()=>setModal(false)}
        title={editTarget?(lang==='ar'?'تعديل الدفعة':'Edit Payment'):T.addNew}
        footer={<>
          <button className="btn btn-secondary" onClick={()=>setModal(false)}>{t.common.cancel}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving?(lang==='ar'?'جارٍ الحفظ...':'Saving...'):t.common.save}
          </button>
        </>}
      >
        <FormField label={T.tenant} required>
          <Select value={form.tenant_id} onChange={v=>upd('tenant_id',v)} options={tenantOpts} placeholder={t.common.selectTenant} />
        </FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label={T.amount} required><Input value={form.amount} onChange={v=>upd('amount',v)} type="number" placeholder="500" /></FormField>
          <FormField label={T.type}><Select value={form.type} onChange={v=>upd('type',v)} options={typeOpts} /></FormField>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label={T.date} required><Input value={form.date} onChange={v=>upd('date',v)} type="date" /></FormField>
          <FormField label={T.status}><Select value={form.status} onChange={v=>upd('status',v)} options={statusOpts} /></FormField>
        </div>
        <FormField label={T.dueDate}><Input value={form.due_date} onChange={v=>upd('due_date',v)} type="date" /></FormField>
        <FormField label={T.notes}><Textarea value={form.notes} onChange={v=>upd('notes',v)} rows={2} /></FormField>
      </Modal>

      <ConfirmModal isOpen={!!delTarget} onClose={()=>setDel(null)} onConfirm={handleDelete}
        title={lang==='ar'?'حذف الدفعة':'Delete Payment'} message={t.messages.deleteConfirm} t={t} />
    </div>
  );
}
