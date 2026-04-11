'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Allowed one-way channels (renderer → main)
const VALID_SEND = ['theme-change', 'language-change', 'navigate', 'toast', 'db-updated'];
// Allowed two-way channels (renderer → main, awaits reply)
const VALID_INVOKE = [
  'store:get', 'store:set',
  'zoom:set',
  'db:query', 'db:run', 'db:get',
  'contract:save', 'contract:open',
  'app:getPath'
];

contextBridge.exposeInMainWorld('electronAPI', {
  // ── Settings / store ──
  getStore: (key, defaultVal)  => ipcRenderer.invoke('store:get', key, defaultVal),
  setStore: (key, value)       => ipcRenderer.invoke('store:set', key, value),

  // ── Theme / Language ──
  setTheme:    (theme) => ipcRenderer.send('theme-change', theme),
  setLanguage: (lang)  => ipcRenderer.send('language-change', lang),

  // ── Zoom ──
  setZoom: (factor) => ipcRenderer.invoke('zoom:set', factor),

  // ── Database ──
  dbQuery: (sql, params) => ipcRenderer.invoke('db:query', sql, params),
  dbRun:   (sql, params) => ipcRenderer.invoke('db:run',   sql, params),
  dbGet:   (sql, params) => ipcRenderer.invoke('db:get',   sql, params),

  // ── Contracts ──
  saveContract: (data)         => ipcRenderer.invoke('contract:save', data),
  openContract: (relativePath) => ipcRenderer.invoke('contract:open', relativePath),

  // ── App paths ──
  getAppPath: (name) => ipcRenderer.invoke('app:getPath', name),

  // ── Generic safe wrappers ──
  send: (channel, data) => {
    if (VALID_SEND.includes(channel)) ipcRenderer.send(channel, data);
  },
  invoke: (channel, ...args) => {
    if (VALID_INVOKE.includes(channel)) return ipcRenderer.invoke(channel, ...args);
    return Promise.reject(new Error(`Channel "${channel}" is not allowed`));
  },
  on: (channel, callback) => {
    if (VALID_SEND.includes(channel)) {
      const sub = (_event, ...args) => callback(...args);
      ipcRenderer.on(channel, sub);
      return () => ipcRenderer.removeListener(channel, sub);
    }
  },

  // ── Platform info ──
  platform: process.platform,
  isElectron: true
});
