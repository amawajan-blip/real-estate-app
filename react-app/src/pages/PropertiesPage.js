import React, { useState } from 'react';
import { useProperties } from '../hooks/useDatabase';
import { useApp } from '../contexts/AppContext';
import { Breadcrumb, Modal, FormField, Input, Select, Textarea, EmptyState, SkeletonRows, ConfirmModal, Icon } from '../components';

export default function PropertiesPage({ t, lang }) {
  const { properties, loading, createProperty, updateProperty, deleteProperty } = useProperties();
  const { showToast } = useApp();
  const T = t.properties;
  const [search, setSearch] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', name_ar: '', location: '', type: 'Residential', description: '', image: '🏢' });

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const typeOpts = [
    { value: 'Residential', label: lang === 'ar' ? 'سكني' : 'Residential' },
    { value: 'Commercial',  label: lang === 'ar' ? 'تجاري' : 'Commercial' },
    { value: 'Mixed',       label: lang === 'ar' ? 'مختلط' : 'Mixed' },
  ];
  const imageOpts = ['🏢','🏡','🏗','🏘','🏚','🏬','🏪','🏨'].map(e => ({ value: e, label: e }));

  const openAdd = () => {
    setForm({ name: '', name_ar: '', location: '', type: 'Residential', description: '', image: '🏢' });
    setEditTarget(null);
    setAddModal(true);
  };
  const openEdit = (p) => {
    setForm({ name: p.name, name_ar: p.name_ar || '', location: p.location || '', type: p.type || 'Residential', description: p.description || '', image: p.image || '🏢' });
    setEditTarget(p);
    setAddModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast(lang === 'ar' ? 'الرجاء إدخال اسم العقار' : 'Property name is required', 'error'); return; }
    setSaving(true);
    try {
      if (editTarget) {
        await updateProperty(editTarget.id, form);
        showToast(t.messages.propertyUpdated, 'success');
      } else {
        await createProperty(form);
        showToast(t.messages.propertyAdded, 'success');
      }
      setAddModal(false);
    } catch (e) {
      showToast(e.message || 'Error', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProperty(deleteTarget.id);
      showToast(t.messages.propertyDeleted, 'success');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const filtered = properties.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.location || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Breadcrumb items={[T.title]} />
      <div className="page-header">
        <h2 className="page-title">{T.title}</h2>
        <button className="btn btn-primary" onClick={openAdd}><Icon.Plus />{T.addNew}</button>
      </div>

      <div className="toolbar">
        <div className="search-wrap" style={{ flex: 1 }}>
          <span className="search-icon"><Icon.Search /></span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={T.search} className="form-control search-input" />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 280, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🏠" title={lang === 'ar' ? 'لا توجد عقارات' : 'No properties yet'} desc={lang === 'ar' ? 'أضف أول عقار' : 'Add your first property to get started'} actionLabel={T.addNew} onAction={openAdd} />
      ) : (
        <div className="prop-grid">
          {filtered.map(p => {
            const pct = p.total_units > 0 ? Math.round((p.occupied_units / p.total_units) * 100) : 0;
            return (
              <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ background: 'linear-gradient(135deg, var(--accent-light), #F3EEFE)', padding: '26px 24px', textAlign: 'center', fontSize: 44 }}>
                  {p.image || '🏢'}
                </div>
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{p.name}</h3>
                    <span style={{ fontSize: 11, background: 'var(--accent-light)', color: 'var(--accent-dark)', borderRadius: 6, padding: '3px 8px', fontWeight: 500 }}>{p.type}</span>
                  </div>
                  {p.location && <p style={{ margin: '0 0 10px', fontSize: 12.5, color: 'var(--text-secondary)' }}>📍 {p.location}</p>}
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    <span>🏠 {p.total_units || 0} {T.units}</span>
                    <span style={{ color: 'var(--success)' }}>✓ {p.occupied_units || 0} {T.occupied}</span>
                    <span style={{ color: 'var(--danger)' }}>○ {p.vacant_units || 0} {T.vacant}</span>
                  </div>
                  <div className="progress-track" style={{ marginBottom: 14 }}>
                    <div className={`progress-fill ${pct >= 80 ? 'green' : pct >= 50 ? '' : 'orange'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => openEdit(p)}><Icon.Edit />{t.common.edit}</button>
                    <button className="btn btn-danger btn-sm btn-icon" onClick={() => setDeleteTarget(p)}><Icon.Trash /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={addModal} onClose={() => setAddModal(false)}
        title={editTarget ? (lang === 'ar' ? 'تعديل العقار' : 'Edit Property') : T.addNew}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setAddModal(false)}>{t.common.cancel}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? (lang === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : t.common.save}
          </button>
        </>}
      >
        <FormField label={T.name} required>
          <Input value={form.name} onChange={v => upd('name', v)} placeholder={lang === 'ar' ? 'برج الغروب' : 'Sunset Tower'} required />
        </FormField>
        <FormField label={lang === 'ar' ? 'الاسم بالعربي' : 'Name in Arabic'}>
          <Input value={form.name_ar} onChange={v => upd('name_ar', v)} placeholder="برج الغروب" />
        </FormField>
        <FormField label={T.location}>
          <Input value={form.location} onChange={v => upd('location', v)} placeholder={lang === 'ar' ? 'عمان، الأردن' : 'Amman, Jordan'} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormField label={T.type}>
            <Select value={form.type} onChange={v => upd('type', v)} options={typeOpts} />
          </FormField>
          <FormField label={lang === 'ar' ? 'الأيقونة' : 'Icon'}>
            <Select value={form.image} onChange={v => upd('image', v)} options={imageOpts} />
          </FormField>
        </div>
        <FormField label={lang === 'ar' ? 'الوصف' : 'Description'}>
          <Textarea value={form.description} onChange={v => upd('description', v)} placeholder={lang === 'ar' ? 'وصف اختياري...' : 'Optional description...'} />
        </FormField>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title={lang === 'ar' ? 'حذف العقار' : 'Delete Property'}
        message={`${t.messages.deleteConfirm}: "${deleteTarget?.name}"?`} t={t} />
    </div>
  );
}
