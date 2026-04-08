'use strict';

const {
  app, BrowserWindow, Menu, Tray, ipcMain,
  shell, dialog, Notification, nativeImage, session,
} = require('electron');
const path  = require('path');
const fs    = require('fs');
const Store = require('electron-store');

const isDev = process.env.NODE_ENV === 'development';

// ── Config store ─────────────────────────────────────────────────────────────
const store = new Store({
  defaults: { windowBounds: { width: 1280, height: 800 }, language: 'en', theme: 'light' },
});

// ── Database ─────────────────────────────────────────────────────────────────
const { initDatabase } = require('../database/init');
const PropertyRepo = require('../database/repositories/PropertyRepository');
const TenantRepo   = require('../database/repositories/TenantRepository');
const PaymentRepo  = require('../database/repositories/PaymentRepository');
const ContractRepo = require('../database/repositories/ContractRepository');

let mainWindow = null;
let tray = null;

const userDataPath = app.getPath('userData');
const contractsDir = path.join(userDataPath, 'data', 'contracts');
if (!fs.existsSync(contractsDir)) fs.mkdirSync(contractsDir, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
function createWindow() {
  const { width, height } = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width, height, minWidth: 900, minHeight: 600,
    title: 'مدير عقاراتك | Real Estate Manager',
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    backgroundColor: '#f7f8fa',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../react-app/build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Production Content-Security-Policy
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
      cb({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:",
          ],
        },
      });
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  // Block DevTools in production
  if (!isDev) {
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' ||
          (input.control && input.shift && (input.key === 'I' || input.key === 'J')) ||
          (input.control && input.key === 'u')) {
        event.preventDefault();
      }
    });
    mainWindow.webContents.on('devtools-opened', () => mainWindow.webContents.closeDevTools());
  }

  mainWindow.on('close', (e) => {
    if (tray && !app.isQuiting) { e.preventDefault(); mainWindow.hide(); return; }
    store.set('windowBounds', mainWindow.getBounds());
  });
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

// ─────────────────────────────────────────────────────────────────────────────
function buildMenu() {
  const isAr = store.get('language') === 'ar';
  const template = [
    {
      label: isAr ? 'ملف' : 'File',
      submenu: [
        { label: isAr ? 'تصدير قاعدة البيانات' : 'Export Database', accelerator: 'CmdOrCtrl+E', click: handleExportDatabase },
        { label: isAr ? 'استيراد قاعدة البيانات' : 'Import Database', accelerator: 'CmdOrCtrl+I', click: handleImportDatabase },
        { type: 'separator' },
        { label: isAr ? 'الإعدادات' : 'Settings', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('navigate', 'settings') },
        { type: 'separator' },
        { label: isAr ? 'خروج' : 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuiting = true; app.quit(); } },
      ],
    },
    {
      label: isAr ? 'تعديل' : 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: isAr ? 'عرض' : 'View',
      submenu: [
        { label: isAr ? 'لوحة التحكم' : 'Dashboard', accelerator: 'CmdOrCtrl+1', click: () => mainWindow?.webContents.send('navigate', 'dashboard') },
        { label: isAr ? 'العقارات' : 'Properties',   accelerator: 'CmdOrCtrl+2', click: () => mainWindow?.webContents.send('navigate', 'properties') },
        { label: isAr ? 'المستأجرون' : 'Tenants',    accelerator: 'CmdOrCtrl+3', click: () => mainWindow?.webContents.send('navigate', 'tenants') },
        { label: isAr ? 'المدفوعات' : 'Payments',    accelerator: 'CmdOrCtrl+4', click: () => mainWindow?.webContents.send('navigate', 'payments') },
        { label: isAr ? 'العقود' : 'Contracts',      accelerator: 'CmdOrCtrl+5', click: () => mainWindow?.webContents.send('navigate', 'contracts') },
        { type: 'separator' },
        { label: isAr ? 'تكبير' : 'Zoom In',  accelerator: 'CmdOrCtrl+Plus', click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() + 0.5) },
        { label: isAr ? 'تصغير' : 'Zoom Out', accelerator: 'CmdOrCtrl+-',    click: () => mainWindow?.webContents.setZoomLevel(mainWindow.webContents.getZoomLevel() - 0.5) },
        { label: isAr ? 'إعادة ضبط' : 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.setZoomLevel(0) },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ label: 'Dev Tools', role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: isAr ? 'مساعدة' : 'Help',
      submenu: [{
        label: isAr ? 'حول البرنامج' : 'About',
        click: () => dialog.showMessageBox(mainWindow, {
          type: 'info', title: 'About',
          message: 'مدير عقاراتك\nReal Estate Manager',
          detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}`,
          buttons: ['OK'],
        }),
      }],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ─────────────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('مدير عقاراتك');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'مدير عقاراتك', enabled: false },
    { type: 'separator' },
    { label: 'Open App', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit(); } },
  ]));
  tray.on('click', () => mainWindow?.isVisible() ? mainWindow.focus() : mainWindow?.show());
}

// ─────────────────────────────────────────────────────────────────────────────
function sendNotification(title, body) {
  if (Notification.isSupported()) new Notification({ title, body, icon: path.join(__dirname, '../assets/icon.png') }).show();
}

async function handleExportDatabase() {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Database',
    defaultPath: path.join(app.getPath('documents'), `backup-${Date.now()}.db`),
    filters: [{ name: 'Database', extensions: ['db'] }],
  });
  if (!filePath) return;
  const src = path.join(userDataPath, 'database.db');
  if (fs.existsSync(src)) { fs.copyFileSync(src, filePath); sendNotification('Exported', 'Database saved'); mainWindow?.webContents.send('toast', { message: 'Database exported!', type: 'success' }); }
}

async function handleImportDatabase() {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, { filters: [{ name: 'Database', extensions: ['db'] }], properties: ['openFile'] });
  if (!filePaths?.length) return;
  const { response } = await dialog.showMessageBox(mainWindow, { type: 'warning', message: 'Replace all data?', buttons: ['Cancel', 'Import'], defaultId: 0 });
  if (response !== 1) return;
  fs.copyFileSync(filePaths[0], path.join(userDataPath, 'database.db'));
  sendNotification('Imported', 'Restarting...');
  setTimeout(() => { app.relaunch(); app.exit(0); }, 1500);
}

// ── IPC: Properties ───────────────────────────────────────────────────────────
ipcMain.handle('db:properties:getAll',   ()            => PropertyRepo.getAll());
ipcMain.handle('db:properties:getById',  (_, id)       => PropertyRepo.getById(id));
ipcMain.handle('db:properties:create',   (_, d)        => PropertyRepo.create(d));
ipcMain.handle('db:properties:update',   (_, id, d)    => PropertyRepo.update(id, d));
ipcMain.handle('db:properties:delete',   (_, id)       => PropertyRepo.delete(id));
ipcMain.handle('db:properties:getStats', ()            => PropertyRepo.getStats());
ipcMain.handle('db:units:getByProperty', (_, pid)      => PropertyRepo.getUnits(pid));
ipcMain.handle('db:units:create',        (_, d)        => PropertyRepo.createUnit(d));
ipcMain.handle('db:units:update',        (_, id, d)    => PropertyRepo.updateUnit(id, d));
ipcMain.handle('db:units:delete',        (_, id)       => PropertyRepo.deleteUnit(id));

// ── IPC: Tenants ──────────────────────────────────────────────────────────────
ipcMain.handle('db:tenants:getAll',     ()         => TenantRepo.getAll());
ipcMain.handle('db:tenants:getById',    (_, id)    => TenantRepo.getById(id));
ipcMain.handle('db:tenants:create',     (_, d)     => TenantRepo.create(d));
ipcMain.handle('db:tenants:update',     (_, id, d) => TenantRepo.update(id, d));
ipcMain.handle('db:tenants:delete',     (_, id)    => TenantRepo.delete(id));
ipcMain.handle('db:tenants:getByUnit',  (_, uid)   => TenantRepo.getByUnit(uid));

// ── IPC: Payments ─────────────────────────────────────────────────────────────
ipcMain.handle('db:payments:getAll',         ()         => PaymentRepo.getAll());
ipcMain.handle('db:payments:getById',        (_, id)    => PaymentRepo.getById(id));
ipcMain.handle('db:payments:create',         (_, d)     => { const r = PaymentRepo.create(d); if (d.amount) sendNotification('دفعة مسجلة', `JD ${d.amount}`); return r; });
ipcMain.handle('db:payments:update',         (_, id, d) => PaymentRepo.update(id, d));
ipcMain.handle('db:payments:delete',         (_, id)    => PaymentRepo.delete(id));
ipcMain.handle('db:payments:getByTenant',    (_, tid)   => PaymentRepo.getByTenant(tid));
ipcMain.handle('db:payments:getOverdue',     ()         => PaymentRepo.getOverdue());
ipcMain.handle('db:payments:getMonthlyStats',()         => PaymentRepo.getMonthlyStats());

// ── IPC: Contracts ────────────────────────────────────────────────────────────
ipcMain.handle('db:contracts:getAll',      ()         => ContractRepo.getAll());
ipcMain.handle('db:contracts:getById',     (_, id)    => ContractRepo.getById(id));
ipcMain.handle('db:contracts:create',      (_, d)     => ContractRepo.create(d));
ipcMain.handle('db:contracts:update',      (_, id, d) => ContractRepo.update(id, d));
ipcMain.handle('db:contracts:delete',      (_, id)    => ContractRepo.delete(id));
ipcMain.handle('db:contracts:getByTenant', (_, tid)   => ContractRepo.getByTenant(tid));

// ── IPC: Dashboard ────────────────────────────────────────────────────────────
ipcMain.handle('db:dashboard:getStats', () => ({
  propStats: PropertyRepo.getStats(), payStats: PaymentRepo.getMonthlyStats(),
  overdue: PaymentRepo.getOverdue(), recentActivity: PaymentRepo.getRecentActivity(10),
}));

// ── IPC: File system ──────────────────────────────────────────────────────────
ipcMain.handle('fs:uploadContract', (_, { sourcePath, tenantId, originalName }) => {
  const ext = path.extname(originalName);
  const fileName = `contract_${tenantId}_${Date.now()}${ext}`;
  const dest = path.join(contractsDir, fileName);
  fs.copyFileSync(sourcePath, dest);
  return { fileName, filePath: dest, relativePath: path.join('data', 'contracts', fileName) };
});
ipcMain.handle('fs:openContract', (_, filePath) => {
  const full = path.isAbsolute(filePath) ? filePath : path.join(userDataPath, filePath);
  if (fs.existsSync(full)) { shell.openPath(full); return { success: true }; }
  return { success: false, error: 'File not found' };
});
ipcMain.handle('fs:selectFile', async () => {
  const { filePaths } = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'Documents', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'docx'] }],
    properties: ['openFile'],
  });
  return filePaths?.[0] || null;
});

// ── IPC: App & Store ──────────────────────────────────────────────────────────
ipcMain.handle('app:minimize',    () => mainWindow?.minimize());
ipcMain.handle('app:maximize',    () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
ipcMain.handle('app:close',       () => mainWindow?.close());
ipcMain.handle('app:getVersion',  () => app.getVersion());
ipcMain.handle('app:getPath',     (_, n) => app.getPath(n));
ipcMain.handle('app:notify',      (_, { title, body }) => sendNotification(title, body));
ipcMain.handle('app:rebuildMenu', () => buildMenu());
ipcMain.handle('store:get',       (_, key) => store.get(key));
ipcMain.handle('store:set',       (_, key, val) => store.set(key, val));
ipcMain.handle('store:getAll',    () => store.store);
ipcMain.handle('db:export',       () => handleExportDatabase());
ipcMain.handle('db:import',       () => handleImportDatabase());

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  initDatabase(); createWindow(); buildMenu(); createTray();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { app.isQuiting = true; });
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (e, url) => { if (!isDev && !url.startsWith('file://')) e.preventDefault(); });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});
