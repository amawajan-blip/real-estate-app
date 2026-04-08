/**
 * ElectronService
 * Wraps window.electronAPI with a fallback for browser development.
 * All calls return Promises for consistent async usage.
 */

const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron === true;

// ─── Browser fallback data ──────────────────────────────────────────────────
let _fallbackDb = {
  properties: [
    { id: 1, name: 'Sunset Tower', name_ar: 'برج الغروب', location: 'Amman, Jordan', type: 'Residential', image: '🏢', total_units: 3, occupied_units: 2, vacant_units: 1 },
    { id: 2, name: 'Green Villa', name_ar: 'فيلا الخضراء', location: 'Zarqa, Jordan', type: 'Commercial', image: '🏡', total_units: 2, occupied_units: 1, vacant_units: 1 },
  ],
  tenants: [
    { id: 1, name: 'Ahmad Al-Hassan', name_ar: 'أحمد الحسن', phone: '+962 79 123 4567', email: 'ahmad@email.com', unit_number: '3A', property_name: 'Sunset Tower', is_primary: 1, balance: 0 },
    { id: 2, name: 'Sara Al-Nouri', name_ar: 'سارة النوري', phone: '+962 77 234 5678', email: 'sara@email.com', unit_number: '5B', property_name: 'Sunset Tower', is_primary: 1, balance: -250 },
    { id: 3, name: 'Khalid Mansour', name_ar: 'خالد منصور', phone: '+962 78 345 6789', email: 'khalid@email.com', unit_number: '1A', property_name: 'Green Villa', is_primary: 1, balance: 0 },
  ],
  payments: [
    { id: 1, tenant_id: 1, tenant_name: 'Ahmad Al-Hassan', amount: 500, type: 'rent', status: 'paid', date: '2024-01-15', unit_number: '3A', property_name: 'Sunset Tower' },
    { id: 2, tenant_id: 2, tenant_name: 'Sara Al-Nouri', amount: 250, type: 'rent', status: 'overdue', date: '2024-01-10', unit_number: '5B', property_name: 'Sunset Tower' },
    { id: 3, tenant_id: 3, tenant_name: 'Khalid Mansour', amount: 800, type: 'rent', status: 'paid', date: '2024-01-20', unit_number: '1A', property_name: 'Green Villa' },
  ],
  contracts: [
    { id: 1, tenant_id: 1, tenant_name: 'Ahmad Al-Hassan', upload_date: '2023-06-01', start_date: '2023-06-01', expiry_date: '2025-06-01', file_path: null, contract_status: 'active' },
    { id: 2, tenant_id: 2, tenant_name: 'Sara Al-Nouri', upload_date: '2023-09-15', start_date: '2023-09-15', expiry_date: '2024-04-15', file_path: null, contract_status: 'expiring_soon' },
  ],
  activity: [
    { id: 1, type: 'payment_recorded', message: 'Ahmad Al-Hassan paid rent', message_ar: 'أحمد الحسن دفع الإيجار', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: 2, type: 'contract_uploaded', message: 'Contract uploaded for Sara', message_ar: 'تم رفع عقد لسارة', created_at: new Date(Date.now() - 5 * 3600000).toISOString() },
    { id: 3, type: 'tenant_added', message: 'Khalid Mansour added as tenant', message_ar: 'خالد منصور أضيف كمستأجر', created_at: new Date(Date.now() - 24 * 3600000).toISOString() },
  ],
  _nextId: { properties: 3, tenants: 4, payments: 4, contracts: 3 },
};

function _nextId(table) {
  _fallbackDb._nextId[table] = (_fallbackDb._nextId[table] || 1) + 1;
  return _fallbackDb._nextId[table];
}

const fallback = {
  properties: {
    getAll: () => Promise.resolve([..._fallbackDb.properties]),
    getById: (id) => Promise.resolve(_fallbackDb.properties.find(p => p.id === id) || null),
    create: (data) => { const item = { id: _nextId('properties'), total_units: 0, occupied_units: 0, vacant_units: 0, image: '🏢', ...data }; _fallbackDb.properties.push(item); return Promise.resolve(item); },
    update: (id, data) => { const i = _fallbackDb.properties.findIndex(p => p.id === id); if (i >= 0) _fallbackDb.properties[i] = { ..._fallbackDb.properties[i], ...data }; return Promise.resolve(_fallbackDb.properties[i]); },
    delete: (id) => { _fallbackDb.properties = _fallbackDb.properties.filter(p => p.id !== id); return Promise.resolve({ success: true }); },
    getStats: () => Promise.resolve({ total_properties: _fallbackDb.properties.length, total_units: 5, occupied_units: 3, vacant_units: 2, occupancy_rate: 60 }),
    getUnits: () => Promise.resolve([]),
    createUnit: (d) => Promise.resolve({ id: _nextId('units'), ...d }),
    updateUnit: (id, d) => Promise.resolve({ id, ...d }),
    deleteUnit: () => Promise.resolve({ success: true }),
  },
  tenants: {
    getAll: () => Promise.resolve([..._fallbackDb.tenants]),
    getById: (id) => Promise.resolve(_fallbackDb.tenants.find(t => t.id === id) || null),
    create: (data) => { const item = { id: _nextId('tenants'), balance: 0, ...data }; _fallbackDb.tenants.push(item); return Promise.resolve(item); },
    update: (id, data) => { const i = _fallbackDb.tenants.findIndex(t => t.id === id); if (i >= 0) _fallbackDb.tenants[i] = { ..._fallbackDb.tenants[i], ...data }; return Promise.resolve(_fallbackDb.tenants[i]); },
    delete: (id) => { _fallbackDb.tenants = _fallbackDb.tenants.filter(t => t.id !== id); return Promise.resolve({ success: true }); },
    getByUnit: () => Promise.resolve([]),
  },
  payments: {
    getAll: () => Promise.resolve([..._fallbackDb.payments]),
    getById: (id) => Promise.resolve(_fallbackDb.payments.find(p => p.id === id) || null),
    create: (data) => {
      const tenant = _fallbackDb.tenants.find(t => t.id === data.tenant_id);
      const item = { id: _nextId('payments'), tenant_name: tenant?.name || '', ...data };
      _fallbackDb.payments.push(item);
      return Promise.resolve(item);
    },
    update: (id, data) => { const i = _fallbackDb.payments.findIndex(p => p.id === id); if (i >= 0) _fallbackDb.payments[i] = { ..._fallbackDb.payments[i], ...data }; return Promise.resolve(_fallbackDb.payments[i]); },
    delete: (id) => { _fallbackDb.payments = _fallbackDb.payments.filter(p => p.id !== id); return Promise.resolve({ success: true }); },
    getByTenant: (tid) => Promise.resolve(_fallbackDb.payments.filter(p => p.tenant_id === tid)),
    getOverdue: () => Promise.resolve(_fallbackDb.payments.filter(p => p.status === 'overdue')),
    getMonthlyStats: () => Promise.resolve([
      { month: '2024-01', income: 4200, expenses: 800 },
      { month: '2024-02', income: 4800, expenses: 950 },
      { month: '2024-03', income: 4500, expenses: 700 },
      { month: '2024-04', income: 5100, expenses: 1200 },
      { month: '2024-05', income: 4900, expenses: 900 },
      { month: '2024-06', income: 5300, expenses: 850 },
    ]),
  },
  contracts: {
    getAll: () => Promise.resolve([..._fallbackDb.contracts]),
    getById: (id) => Promise.resolve(_fallbackDb.contracts.find(c => c.id === id) || null),
    create: (data) => { const item = { id: _nextId('contracts'), contract_status: 'active', ...data }; _fallbackDb.contracts.push(item); return Promise.resolve(item); },
    update: (id, data) => { const i = _fallbackDb.contracts.findIndex(c => c.id === id); if (i >= 0) _fallbackDb.contracts[i] = { ..._fallbackDb.contracts[i], ...data }; return Promise.resolve(_fallbackDb.contracts[i]); },
    delete: (id) => { _fallbackDb.contracts = _fallbackDb.contracts.filter(c => c.id !== id); return Promise.resolve({ success: true }); },
    getByTenant: (tid) => Promise.resolve(_fallbackDb.contracts.filter(c => c.tenant_id === tid)),
  },
  dashboard: {
    getStats: () => Promise.resolve({
      propStats: { total_properties: 2, total_units: 5, occupied_units: 3, vacant_units: 2, occupancy_rate: 60 },
      payStats: [
        { month: '2024-01', income: 4200, expenses: 800 },
        { month: '2024-02', income: 4800, expenses: 950 },
        { month: '2024-03', income: 5100, expenses: 700 },
      ],
      overdue: _fallbackDb.payments.filter(p => p.status === 'overdue'),
      recentActivity: _fallbackDb.activity,
    }),
  },
  fs: {
    uploadContract: () => Promise.resolve({ fileName: 'contract.pdf', filePath: '/data/contracts/contract.pdf' }),
    openContract: () => Promise.resolve({ success: true }),
    selectFile: () => Promise.resolve(null),
  },
  app: {
    minimize: () => Promise.resolve(),
    maximize: () => Promise.resolve(),
    close: () => Promise.resolve(),
    getVersion: () => Promise.resolve('1.0.0'),
    notify: () => Promise.resolve(),
    rebuildMenu: () => Promise.resolve(),
  },
  store: {
    get: (key) => Promise.resolve(key === 'language' ? 'en' : key === 'theme' ? 'light' : null),
    set: () => Promise.resolve(),
    getAll: () => Promise.resolve({ language: 'en', theme: 'light' }),
  },
  db: {
    export: () => Promise.resolve(),
    import: () => Promise.resolve(),
  },
  on: () => {},
  off: () => {},
};

// ─── Public API ─────────────────────────────────────────────────────────────────
const api = isElectron ? window.electronAPI : fallback;

export { isElectron };
export default api;
