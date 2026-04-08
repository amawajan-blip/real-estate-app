'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// ─── Expose safe API to renderer ───────────────────────────────────────────────
contextBridge.exposeInMainWorld('electronAPI', {

  // ── Properties ──────────────────────────────────────────────────────────────
  properties: {
    getAll: () => ipcRenderer.invoke('db:properties:getAll'),
    getById: (id) => ipcRenderer.invoke('db:properties:getById', id),
    create: (data) => ipcRenderer.invoke('db:properties:create', data),
    update: (id, data) => ipcRenderer.invoke('db:properties:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:properties:delete', id),
    getStats: () => ipcRenderer.invoke('db:properties:getStats'),
    getUnits: (propertyId) => ipcRenderer.invoke('db:units:getByProperty', propertyId),
    createUnit: (data) => ipcRenderer.invoke('db:units:create', data),
    updateUnit: (id, data) => ipcRenderer.invoke('db:units:update', id, data),
    deleteUnit: (id) => ipcRenderer.invoke('db:units:delete', id),
  },

  // ── Tenants ──────────────────────────────────────────────────────────────────
  tenants: {
    getAll: () => ipcRenderer.invoke('db:tenants:getAll'),
    getById: (id) => ipcRenderer.invoke('db:tenants:getById', id),
    create: (data) => ipcRenderer.invoke('db:tenants:create', data),
    update: (id, data) => ipcRenderer.invoke('db:tenants:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:tenants:delete', id),
    getByUnit: (unitId) => ipcRenderer.invoke('db:tenants:getByUnit', unitId),
  },

  // ── Payments ─────────────────────────────────────────────────────────────────
  payments: {
    getAll: () => ipcRenderer.invoke('db:payments:getAll'),
    getById: (id) => ipcRenderer.invoke('db:payments:getById', id),
    create: (data) => ipcRenderer.invoke('db:payments:create', data),
    update: (id, data) => ipcRenderer.invoke('db:payments:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:payments:delete', id),
    getByTenant: (tenantId) => ipcRenderer.invoke('db:payments:getByTenant', tenantId),
    getOverdue: () => ipcRenderer.invoke('db:payments:getOverdue'),
    getMonthlyStats: () => ipcRenderer.invoke('db:payments:getMonthlyStats'),
  },

  // ── Contracts ────────────────────────────────────────────────────────────────
  contracts: {
    getAll: () => ipcRenderer.invoke('db:contracts:getAll'),
    getById: (id) => ipcRenderer.invoke('db:contracts:getById', id),
    create: (data) => ipcRenderer.invoke('db:contracts:create', data),
    update: (id, data) => ipcRenderer.invoke('db:contracts:update', id, data),
    delete: (id) => ipcRenderer.invoke('db:contracts:delete', id),
    getByTenant: (tenantId) => ipcRenderer.invoke('db:contracts:getByTenant', tenantId),
  },

  // ── Dashboard ────────────────────────────────────────────────────────────────
  dashboard: {
    getStats: () => ipcRenderer.invoke('db:dashboard:getStats'),
  },

  // ── File System ──────────────────────────────────────────────────────────────
  fs: {
    uploadContract: (data) => ipcRenderer.invoke('fs:uploadContract', data),
    openContract: (filePath) => ipcRenderer.invoke('fs:openContract', filePath),
    selectFile: () => ipcRenderer.invoke('fs:selectFile'),
  },

  // ── App Controls ─────────────────────────────────────────────────────────────
  app: {
    minimize: () => ipcRenderer.invoke('app:minimize'),
    maximize: () => ipcRenderer.invoke('app:maximize'),
    close: () => ipcRenderer.invoke('app:close'),
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    notify: (data) => ipcRenderer.invoke('app:notify', data),
    rebuildMenu: () => ipcRenderer.invoke('app:rebuildMenu'),
  },

  // ── Settings Store ────────────────────────────────────────────────────────────
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    getAll: () => ipcRenderer.invoke('store:getAll'),
  },

  // ── Database Operations ───────────────────────────────────────────────────────
  db: {
    export: () => ipcRenderer.invoke('db:export'),
    import: () => ipcRenderer.invoke('db:import'),
  },

  // ── Event Listeners (main → renderer) ────────────────────────────────────────
  on: (channel, callback) => {
    const allowed = ['navigate', 'toast', 'theme-change', 'db-updated'];
    if (allowed.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  },

  // ── Platform info ─────────────────────────────────────────────────────────────
  platform: process.platform,
  isElectron: true,
});
