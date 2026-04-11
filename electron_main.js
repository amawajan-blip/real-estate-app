'use strict';

const { app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── Globals ────────────────────────────────────────────────────────────────
let mainWindow = null;
let tray = null;
let db = null;
let store = null;

const isDev = process.env.NODE_ENV === 'development';

// ─── Paths ───────────────────────────────────────────────────────────────────
const REACT_BUILD = path.join(__dirname, '..', 'react-app', 'build', 'index.html');
const ASSETS_DIR  = path.join(__dirname, '..', 'assets');

// ─── electron-store ──────────────────────────────────────────────────────────
function initStore() {
  try {
    const Store = require('electron-store');
    store = new Store({
      defaults: { theme: 'light', language: 'en', zoom: 1.0 }
    });
  } catch (e) {
    console.warn('electron-store unavailable:', e.message);
    store = {
      _data: {},
      get(k, d) { return this._data[k] !== undefined ? this._data[k] : d; },
      set(k, v) { this._data[k] = v; }
    };
  }
}

// ─── Database ─────────────────────────────────────────────────────────────────
function initDatabase() {
  try {
    const dbInit = require('../database/init');
    db = dbInit.initDatabase();
    console.log('Database initialised');
  } catch (e) {
    console.error('Database init failed:', e.message);
    db = null;
  }
}

// ─── Window ───────────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: !isDev
    },
    icon: path.join(ASSETS_DIR, process.platform === 'win32' ? 'icon.ico' : 'icon.png')
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(REACT_BUILD);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    const zoom = store ? store.get('zoom', 1.0) : 1.0;
    mainWindow.webContents.setZoomFactor(zoom);
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Block external navigation
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (isDev && url.startsWith('http://localhost:3000')) return;
    e.preventDefault();
    shell.openExternal(url);
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  buildMenu();
}

// ─── Tray ─────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(ASSETS_DIR, 'tray-icon.png');
  if (!fs.existsSync(iconPath)) return;
  try {
    tray = new Tray(iconPath);
    tray.setToolTip('Real Estate Manager');
    tray.on('click', () => { if (mainWindow) mainWindow.show(); });
  } catch (e) {
    console.warn('Tray creation failed:', e.message);
  }
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
function buildMenu() {
  const lang = store ? store.get('language', 'en') : 'en';
  const isAR = lang === 'ar';

  const template = [
    {
      label: isAR ? 'ملف' : 'File',
      submenu: [
        {
          label: isAR ? 'تصدير قاعدة البيانات' : 'Export Database',
          accelerator: 'CmdOrCtrl+E',
          click: exportDatabase
        },
        {
          label: isAR ? 'استيراد قاعدة البيانات' : 'Import Database',
          accelerator: 'CmdOrCtrl+I',
          click: importDatabase
        },
        { type: 'separator' },
        {
          label: isAR ? 'خروج' : 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: isAR ? 'عرض' : 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'zoomIn',  accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─── DB export / import ───────────────────────────────────────────────────────
async function exportDatabase() {
  if (!mainWindow) return;
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'database-backup.db',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });
  if (!filePath) return;
  const src = path.join(app.getPath('userData'), 'database.db');
  try { fs.copyFileSync(src, filePath); } catch (e) { console.error(e); }
}

async function importDatabase() {
  if (!mainWindow) return;
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile']
  });
  if (!filePaths || !filePaths[0]) return;
  const dest = path.join(app.getPath('userData'), 'database.db');
  try {
    fs.copyFileSync(filePaths[0], dest);
    app.relaunch();
    app.exit(0);
  } catch (e) { console.error(e); }
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
function registerIpcHandlers() {
  // Settings
  ipcMain.handle('store:get', (_e, key, defaultVal) => store ? store.get(key, defaultVal) : defaultVal);
  ipcMain.handle('store:set', (_e, key, value)      => store ? store.set(key, value) : null);

  // Theme
  ipcMain.on('theme-change', (_e, theme) => {
    if (store) store.set('theme', theme);
  });

  // Language
  ipcMain.on('language-change', (_e, lang) => {
    if (store) store.set('language', lang);
    buildMenu();
  });

  // Zoom
  ipcMain.handle('zoom:set', (_e, factor) => {
    if (mainWindow) {
      mainWindow.webContents.setZoomFactor(factor);
      if (store) store.set('zoom', factor);
    }
  });

  // ── Database operations ──
  ipcMain.handle('db:query', (_e, sql, params = []) => {
    if (!db) return { error: 'Database not initialised' };
    try { return db.prepare(sql).all(...params); } catch (e) { return { error: e.message }; }
  });
  ipcMain.handle('db:run', (_e, sql, params = []) => {
    if (!db) return { error: 'Database not initialised' };
    try { return db.prepare(sql).run(...params); } catch (e) { return { error: e.message }; }
  });
  ipcMain.handle('db:get', (_e, sql, params = []) => {
    if (!db) return { error: 'Database not initialised' };
    try { return db.prepare(sql).get(...params); } catch (e) { return { error: e.message }; }
  });

  // Contract file upload
  ipcMain.handle('contract:save', async (_e, { buffer, fileName, tenantId }) => {
    const contractsDir = path.join(app.getPath('userData'), 'data', 'contracts');
    fs.mkdirSync(contractsDir, { recursive: true });
    const ext  = path.extname(fileName);
    const name = `contract_${tenantId}_${Date.now()}${ext}`;
    const dest = path.join(contractsDir, name);
    fs.writeFileSync(dest, Buffer.from(buffer));
    return { relativePath: path.join('data', 'contracts', name) };
  });

  ipcMain.handle('contract:open', (_e, relativePath) => {
    const full = path.join(app.getPath('userData'), relativePath);
    shell.openPath(full);
  });

  ipcMain.handle('app:getPath', (_e, name) => app.getPath(name));
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initStore();
  initDatabase();
  registerIpcHandlers();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
