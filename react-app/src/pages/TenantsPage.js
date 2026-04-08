import React, { useState } from 'react';
import { useTenants, useProperties } from '../hooks/useDatabase';
import { useApp } from '../contexts/AppContext';
import {
  Breadcrumb, Modal, FormField, Input, Select, Textarea,
  EmptyState, SkeletonRows, ConfirmModal, Tabs, Pagination,
  Badge, Avatar, Icon
} from '../components';

export default function TenantsPage({ t, lang }) {
  const { tenants, loading, createTenant, updateTenant, deleteTenant } = useTenants();
  const { properties } = useProperties();
  const { showToast } = useApp();
  const T = t.tenants;

  const [search, setSearch]    = useState('');
  const [tab, setTab]          = useState('all');
  const [page, setPage]        = useState(1);
  const [modal, setModal]      = useState(false);
  const [editTarget, setEdit]  = useState(null);
  const [deleteTarget, setDel] = useState(null);
  const [saving, setSaving]    = useState(false);
  const [units, setUnits]      = useState([]);
  const [selectedProp, setSP]  = useState('');

  const empty = { name:'', name_ar:'', phone:'', email:'', national_id:'', unit_id:'', is_primary:'1', move_in_date:'', notes:'' };
  const [form, setForm] = useState(empty);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const loadUnits = async (propertyId) => {
    if (!propertyId) { setUnits([]); return; }
    const api = (await import('../services/electronService')).default;
    const us  = await api.properties.getUnits(Number(propertyId));
    setUnits(us || []);
  };

  const openAdd = () => {
    setForm(empty); setEdit(null); setSP(''); setUnits([]);
    setModal(true);
  };
  const openEdit = (tn) => {
    setForm({
      name: tn.name||'', name_ar: tn.name_ar||'', phone: tn.phone||'',
      email: tn.email||'', national_id: tn.national_id||'',
      unit_id: String(tn.unit_id||''), is_primary: String(tn.is_primary??1),
      move_in_date: tn.move_in_date||'', notes: tn.notes||'',
    });
    setEdit(tn); setModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast(lang==='ar' ? 'الاسم مطلوب' : 'Name is required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, unit_id: form.unit_id ? Number(form.unit_id) : null, is_primary: Number(form.is_primary) };
      if (editTarget) {
        await updateTenant(editTarget.id, payload);
        showToast(t.messages.changesSaved, 'success');
      } else {
        await createTenant(payload);
        showToast(t.messages.tenantAdded, 'success');
      }
      setModal(false);
    } catch (e) { showToast(e.message||'Error','error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await deleteTenant(deleteTarget.id); showToast(t.messages.tenantDeleted,'success'); }
    catch (e) { showToast(e.message,'error'); }
  };

  const perPage = 8;
  const filtered = tenants.filter(tn => {
    const q = search.toLowerCase();
    const matchSearch = tn.name.toLowerCase().includes(q) || (tn.property_name||'').toLowerCase().includes(q) || (tn.phone||'').includes(q);
    const matchTab = tab==='all' || (tab==='primary' && tn.is_primary) || (tab==='sub' && !tn.is_primary);
    return matchSearch && matchTab;
  });
  const paged = filtered.slice((page-1)*perPage, page*perPage);

  const propOpts = properties.map(p => ({ value: p.id, label: p.name }));
  const unitOpts = units.map(u => ({ value: u.id, label: `${u.unit_number}${u.tenant_name ? ` (${lang==='ar'?'مشغول':'Occupied'})` : ''}` }));

  return (
    <div>
      <Breadcrumb items={[T.title]} />
      <div className="page-header">
        <h2 className="page-title">{T.title}</h2>
        <button className="btn btn-primary" onClick={openAdd}><Icon.Plus />{T.addNew}</button>
      </div>

      <Tabs tabs={[
        { key:'all',     label: t.common.all },
        { key:'primary', label: T.primary },
        { key:'sub',     label: T.sub },
      ]} activeTab={tab} onTab={k => { setTab(k); setPage(1); }} />

      <div className="toolbar">
        <div className="search-wrap" style={{ flex:1 }}>
          <span className="search-icon"><Icon.Search /></span>
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder={T.search} className="form-control search-input" />
        </div>
      </div>

      <div className="table-wrap">
        {loading ? <SkeletonRows count={5} /> : paged.length === 0 ? (
          <EmptyState icon="👥" title={lang==='ar'?'لا يوجد مستأجرون':'No tenants found'}
            desc={lang==='ar'?'أضف مستأجراً للبدء':'Add a tenant to get started'}
            actionLabel={T.addNew} onAction={openAdd} />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>{lang==='ar'?'المستأجر':'Tenant'}</th>
                <th>{T.property}</th>
                <th>{T.unit}</th>
                <th>{T.phone}</th>
                <th>{T.balance}</th>
                <th>{lang==='ar'?'نوع':'Type'}</th>
                <th>{lang==='ar'?'إجراءات':'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(tn => (
                <tr key={tn.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={tn.name} size={34} />
                      <div>
                        <div style={{ fontWeight:500, fontSize:13.5 }}>{tn.name}</div>
                        <div style={{ fontSize:11.5, color:'var(--text-tertiary)' }}>{tn.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ color:'var(--text-secondary)', fontSize:13 }}>{tn.property_name||'—'}</td>
                  <td>
                    {tn.unit_number
                      ? <span style={{ background:'var(--bg-secondary)', borderRadius:6, padding:'3px 8px', fontSize:12, fontWeight:500 }}>{tn.unit_number}</span>
                      : <span style={{ color:'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td style={{ fontSize:12.5, color:'var(--text-secondary)' }}>{tn.phone||'—'}</td>
                  <td style={{ fontWeight:700, color:(tn.balance||0)<0?'var(--danger)':(tn.balance||0)>0?'var(--success)':'var(--text-primary)' }}>
                    JD {Math.abs(tn.balance||0)}
                  </td>
                  <td>
                    <Badge status={tn.is_primary?'active':'pending'} label={tn.is_primary?T.primary:T.sub} />
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:5 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => openEdit(tn)}><Icon.Edit /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" style={{ color:'var(--danger)' }} onClick={() => setDel(tn)}><Icon.Trash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination total={filtered.length} page={page} perPage={perPage} onPage={setPage} />
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)}
        title={editTarget ? (lang==='ar'?'تعديل المستأجر':'Edit Tenant') : T.addNew}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setModal(false)}>{t.common.cancel}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving?(lang==='ar'?'جارٍ الحفظ...':'Saving...'):t.common.save}
          </button>
        </>}
      >
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label={T.name} required><Input value={form.name} onChange={v=>upd('name',v)} placeholder="Ahmad Al-Hassan" required /></FormField>
          <FormField label={lang==='ar'?'الاسم بالعربي':'Arabic Name'}><Input value={form.name_ar} onChange={v=>upd('name_ar',v)} placeholder="أحمد الحسن" /></FormField>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label={T.phone}><Input value={form.phone} onChange={v=>upd('phone',v)} type="tel" placeholder="+962 79 123 4567" /></FormField>
          <FormField label={T.email}><Input value={form.email} onChange={v=>upd('email',v)} type="email" placeholder="tenant@email.com" /></FormField>
        </div>
        <FormField label={T.nationalId}><Input value={form.national_id} onChange={v=>upd('national_id',v)} placeholder="1234567890" /></FormField>
        <FormField label={lang==='ar'?'العقار':'Property'}>
          <Select value={selectedProp} onChange={v=>{ setSP(v); loadUnits(v); upd('unit_id',''); }}
            options={propOpts} placeholder={t.common.selectProperty} />
        </FormField>
        <FormField label={lang==='ar'?'الوحدة':'Unit'}>
          <Select value={form.unit_id} onChange={v=>upd('unit_id',v)} options={unitOpts} placeholder={t.common.selectUnit} />
        </FormField>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <FormField label={lang==='ar'?'نوع المستأجر':'Tenant Type'}>
            <Select value={form.is_primary} onChange={v=>upd('is_primary',v)}
              options={[{value:'1',label:T.primary},{value:'0',label:T.sub}]} />
          </FormField>
          <FormField label={T.moveIn}><Input value={form.move_in_date} onChange={v=>upd('move_in_date',v)} type="date" /></FormField>
        </div>
        <FormField label={T.notes}><Textarea value={form.notes} onChange={v=>upd('notes',v)} placeholder={lang==='ar'?'ملاحظات...':'Notes...'} /></FormField>
      </Modal>

      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDel(null)} onConfirm={handleDelete}
        title={lang==='ar'?'حذف المستأجر':'Delete Tenant'}
        message={`${t.messages.deleteConfirm}: "${deleteTarget?.name}"?`} t={t} />
    </div>
  );
}
