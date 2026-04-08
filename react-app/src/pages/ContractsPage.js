import React, { useState } from 'react';
import { useContracts, useTenants } from '../hooks/useDatabase';
import { useApp } from '../contexts/AppContext';
import api from '../services/electronService';
import {
  Breadcrumb, Modal, FormField, Input, Select, Textarea,
  EmptyState, SkeletonRows, ConfirmModal, FileUploader, Badge, Icon
} from '../components';

export default function ContractsPage({ t, lang }) {
  const { contracts, loading, createContract, updateContract, deleteContract } = useContracts();
  const { tenants } = useTenants();
  const { showToast } = useApp();
  const T = t.contracts;

  const [search, setSearch]   = useState('');
  const [modal, setModal]     = useState(false);
  const [editTarget, setEdit] = useState(null);
  const [delTarget, setDel]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [selFile, setSelFile] = useState(null);   // { path, name }

  const empty = { tenant_id:'', start_date:'', expiry_date:'', rent_amount:'', notes:'' };
  const [form, setForm] = useState(empty);
  const upd = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const openAdd  = () => { setForm(empty); setEdit(null); setSelFile(null); setModal(true); };
  const openEdit = (c) => {
    setForm({ tenant_id:String(c.tenant_id||''), start_date:c.start_date||'',
      expiry_date:c.expiry_date||'', rent_amount:String(c.rent_amount||''), notes:c.notes||'' });
    setSelFile(null); setEdit(c); setModal(true);
  };

  const handleSave = async () => {
    if (!form.tenant_id) { showToast(lang==='ar'?'اختر مستأجراً':'Select a tenant','error'); return; }
    setSaving(true);
    try {
      let filePath = editTarget?.file_path || null;
      let fileName = editTarget?.file_name || null;

      // Upload file if selected
      if (selFile?.path) {
        const result = await api.fs.uploadContract({
          sourcePath: selFile.path,
          tenantId: Number(form.tenant_id),
          originalName: selFile.name,
        });
        filePath = result.relativePath || result.filePath;
        fileName = result.fileName;
      }

      const payload = {
        ...form,
        tenant_id: Number(form.tenant_id),
        rent_amount: form.rent_amount ? Number(form.rent_amount) : null,
        file_path: filePath,
        file_name: fileName,
      };

      if (editTarget) { await updateContract(editTarget.id, payload); showToast(t.messages.changesSaved,'success'); }
      else            { await createContract(payload);                showToast(t.messages.contractUploaded,'success'); }
      setModal(false);
    } catch(e) { showToast(e.message||'Error','error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await deleteContract(delTarget.id); showToast(lang==='ar'?'تم حذف العقد':'Contract deleted','success'); }
    catch(e) { showToast(e.message,'error'); }
  };

  const handleOpen = async (c) => {
    if (!c.file_path) { showToast(lang==='ar'?'لا يوجد ملف مرفوع':'No file uploaded','error'); return; }
    const result = await api.fs.openContract(c.file_path);
    if (!result?.success) showToast(lang==='ar'?'الملف غير موجود':'File not found','error');
  };

  const filtered = contracts.filter(c => {
    const q = search.toLowerCase();
    return (c.tenant_name||'').toLowerCase().includes(q) || (c.property_name||'').toLowerCase().includes(q);
  });

  const tenantOpts = tenants.map(tn => ({ value:tn.id, label:tn.name }));

  const statusLabel = (s, lang) => ({
    active:        lang==='ar'?'نشط':'Active',
    expired:       lang==='ar'?'منتهي':'Expired',
    expiring_soon: lang==='ar'?'ينتهي قريباً':'Expiring Soon',
  })[s] || s;

  return (
    <div>
      <Breadcrumb items={[T.title]} />
      <div className="page-header">
        <h2 className="page-title">{T.title}</h2>
        <button className="btn btn-primary" onClick={openAdd}><Icon.Upload />{T.addNew}</button>
      </div>

      <div className="toolbar">
        <div className="search-wrap" style={{ flex:1 }}>
          <span className="search-icon"><Icon.Search /></span>
          <input value={search} onChange={e=>setSearch(e.target.value)}
            placeholder={T.search} className="form-control search-input" />
        </div>
      </div>

      {loading ? (
        <div className="contract-grid">
          {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:220, borderRadius:14 }} />)}
        </div>
      ) : filtered.length===0 ? (
        <EmptyState icon="📄" title={lang==='ar'?'لا توجد عقود':'No contracts found'}
          desc={lang==='ar'?'ارفع أول عقد':'Upload your first contract'}
          actionLabel={T.addNew} onAction={openAdd} />
      ) : (
        <div className="contract-grid">
          {filtered.map(c => {
            const isExpiring = c.contract_status==='expiring_soon';
            const isExpired  = c.contract_status==='expired';
            return (
              <div key={c.id} className="card" style={{
                borderColor: isExpired?'var(--danger)':isExpiring?'var(--warning)':'var(--border)',
                padding: 20,
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div style={{ width:44, height:44, background:'var(--accent-light)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>📄</div>
                  <Badge status={c.contract_status} label={statusLabel(c.contract_status,lang)} />
                </div>
                <h4 style={{ margin:'0 0 4px', fontWeight:700, fontSize:15 }}>{c.tenant_name}</h4>
                {c.property_name && <p style={{ margin:'0 0 4px', fontSize:12.5, color:'var(--text-secondary)' }}>🏢 {c.property_name}</p>}
                {c.unit_number   && <p style={{ margin:'0 0 12px', fontSize:12.5, color:'var(--text-secondary)' }}>🏠 {c.unit_number}</p>}

                <div style={{ background:'var(--bg-secondary)', borderRadius:8, padding:'10px 12px', marginBottom:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:12 }}>
                    <span style={{ color:'var(--text-tertiary)' }}>{lang==='ar'?'بداية':'Start'}</span>
                    <span style={{ fontWeight:500 }}>{c.start_date||'—'}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                    <span style={{ color:'var(--text-tertiary)' }}>{T.expiry}</span>
                    <span style={{ fontWeight:600, color:isExpired?'var(--danger)':isExpiring?'var(--warning)':'var(--text-primary)' }}>{c.expiry_date||'—'}</span>
                  </div>
                  {c.rent_amount && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontSize:12 }}>
                      <span style={{ color:'var(--text-tertiary)' }}>{T.rent}</span>
                      <span style={{ fontWeight:600 }}>JD {c.rent_amount}</span>
                    </div>
                  )}
                </div>

                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-secondary btn-sm" style={{ flex:1 }} onClick={()=>handleOpen(c)}
                    disabled={!c.file_path}>
                    <Icon.Eye />{T.viewContract}
                  </button>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={()=>openEdit(c)}><Icon.Edit /></button>
                  <button className="btn btn-ghost btn-sm btn-icon" style={{ color:'var(--danger)' }} onClick={()=>setDel(c)}><Icon.Trash /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modal} onClose={()=>setModal(false)}
        title={editTarget?(lang==='ar'?'تعديل العقد':'Edit Contract'):T.addNew}
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
          <FormField label={T.startDate}><Input value={form.start_date} onChange={v=>upd('start_date',v)} type="date" /></FormField>
          <FormField label={T.expiry}><Input value={form.expiry_date} onChange={v=>upd('expiry_date',v)} type="date" /></FormField>
        </div>
        <FormField label={T.rent}>
          <Input value={form.rent_amount} onChange={v=>upd('rent_amount',v)} type="number" placeholder="500" />
        </FormField>
        <FormField label={lang==='ar'?'ملف العقد':'Contract File'}>
          <FileUploader lang={lang} fileName={editTarget?.file_name}
            onFileSelected={(path,name)=>setSelFile({ path, name })} />
        </FormField>
        <FormField label={t.tenants.notes}>
          <Textarea value={form.notes} onChange={v=>upd('notes',v)} rows={2} />
        </FormField>
      </Modal>

      <ConfirmModal isOpen={!!delTarget} onClose={()=>setDel(null)} onConfirm={handleDelete}
        title={lang==='ar'?'حذف العقد':'Delete Contract'} message={t.messages.deleteConfirm} t={t} />
    </div>
  );
}
