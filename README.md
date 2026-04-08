# محاسب عقاراتك | Real Estate Accountant
### Production Desktop Application — Electron + React + SQLite

---

## 🗂 Project Structure

```
real-estate-accountant/
├── electron/
│   ├── main.js              # Main process: window, tray, IPC, menus
│   └── preload.js           # Secure context bridge (IPC API)
│
├── react-app/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js            # Root component
│       ├── App.css           # Global styles + light/dark theme vars
│       ├── index.js          # ReactDOM entry
│       ├── contexts/
│       │   └── AppContext.js # Language, theme, navigation, toasts
│       ├── hooks/
│       │   └── useDatabase.js # Data hooks: useProperties, useTenants, …
│       ├── services/
│       │   └── electronService.js # IPC bridge + browser fallback
│       ├── i18n/
│       │   └── translations.js    # EN / AR strings
│       ├── components/
│       │   └── index.js      # 33+ shared UI components
│       └── pages/
│           ├── DashboardPage.js
│           ├── PropertiesPage.js
│           ├── TenantsPage.js
│           ├── PaymentsPage.js
│           ├── ContractsPage.js
│           ├── ReportsPage.js
│           └── SettingsPage.js
│
├── database/
│   ├── init.js               # SQLite init, schema, seed data
│   └── repositories/
│       ├── PropertyRepository.js
│       ├── TenantRepository.js
│       ├── PaymentRepository.js
│       └── ContractRepository.js
│
├── assets/
│   ├── icon.png              # 512×512 app icon
│   ├── icon.ico              # Windows icon
│   ├── icon.icns             # macOS icon
│   └── tray-icon.png         # 16×16 or 22×22 tray icon
│
├── package.json              # Root — Electron config + electron-builder
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- **Node.js** ≥ 18.x  — https://nodejs.org
- **npm** ≥ 9.x (comes with Node)
- Windows 10/11 for `.exe` build

### 1. Install root dependencies
```bash
cd real-estate-accountant
npm install
```

### 2. Install React app dependencies
```bash
cd react-app
npm install
cd ..
```

### 3. Add app icons (required for packaging)
Place these files in the `assets/` folder:
- `icon.png`  — 512×512 PNG (used on Linux and as source)
- `icon.ico`  — Windows multi-size icon
- `icon.icns` — macOS icon set
- `tray-icon.png` — 16×16 or 22×22 PNG for system tray

> **Quick test icon**: Run `node scripts/generate-icon.js` (see below) to auto-generate placeholder icons.

---

## 🚀 Running the App

### Development mode (hot-reload React + Electron)
```bash
npm run electron:dev
```
This starts React on `http://localhost:3000` and Electron loads that URL.
The DevTools panel opens automatically in dev mode.

### Production preview (uses built React)
```bash
npm run electron:prod
```

---

## 📦 Building the Windows Installer (.exe)

```bash
npm run build:win
```

Output in `dist/`:
```
dist/
  محاسب عقاراتك Setup 1.0.0.exe   ← NSIS installer
  محاسب عقاراتك 1.0.0.exe          ← Portable executable
```

### Build for all platforms
```bash
npm run build:all
```

---

## 🗃 Database

### Location (auto-created on first run)
```
Windows: C:\Users\<user>\AppData\Roaming\real-estate-accountant\database.db
macOS:   ~/Library/Application Support/real-estate-accountant/database.db
Linux:   ~/.config/real-estate-accountant/database.db
```

### Schema
```sql
-- Properties
CREATE TABLE properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ar TEXT,
  location TEXT,
  type TEXT DEFAULT 'Residential',
  description TEXT,
  image TEXT DEFAULT '🏢',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Units (belong to properties)
CREATE TABLE units (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL,
  unit_number TEXT NOT NULL,
  floor INTEGER DEFAULT 0,
  area_sqm REAL,
  rent_amount REAL DEFAULT 0,
  status TEXT DEFAULT 'vacant',    -- 'vacant' | 'occupied'
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Tenants (linked to units)
CREATE TABLE tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ar TEXT,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  unit_id INTEGER,
  is_primary INTEGER DEFAULT 1,    -- 1 = primary, 0 = sub-tenant
  move_in_date TEXT,
  notes TEXT,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
);

-- Payments
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  type TEXT DEFAULT 'rent',        -- 'rent'|'electricity'|'water'|'tax'
  status TEXT DEFAULT 'paid',      -- 'paid'|'overdue'|'pending'
  date TEXT NOT NULL,
  due_date TEXT,
  notes TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Contracts
CREATE TABLE contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id INTEGER NOT NULL,
  file_name TEXT,
  file_path TEXT,                  -- relative path under userData
  upload_date TEXT,
  start_date TEXT,
  expiry_date TEXT,
  rent_amount REAL,
  notes TEXT,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Activity log
CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  message_ar TEXT,
  entity_id INTEGER,
  entity_type TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Demo data
On first launch, sample data is automatically seeded:
- 3 properties with units
- 4 tenants
- 9 payments
- 3 contracts

---

## 📁 Contract File Storage

Uploaded contracts are saved to:
```
Windows: C:\Users\<user>\AppData\Roaming\real-estate-accountant\data\contracts\
```

File naming: `contract_{tenantId}_{timestamp}.{ext}`

The relative path is stored in the `contracts.file_path` column and resolved at runtime using `app.getPath('userData')`.

---

## 🔐 Security Architecture

| Layer | Implementation |
|-------|---------------|
| `nodeIntegration` | Disabled (`false`) in renderer |
| `contextIsolation` | Enabled (`true`) |
| `sandbox` | Disabled only for preload (required for IPC) |
| IPC surface | Exposed only via `preload.js` → `contextBridge` |
| Allowed IPC channels | Allowlisted in preload: `navigate`, `toast`, `theme-change`, `db-updated` |
| External navigation | Blocked via `will-navigate` + `setWindowOpenHandler` |

---

## ⌨️ Keyboard Shortcuts

| Action | Windows/Linux |
|--------|--------------|
| Dashboard | `Ctrl+1` |
| Properties | `Ctrl+2` |
| Tenants | `Ctrl+3` |
| Payments | `Ctrl+4` |
| Settings | `Ctrl+,` |
| Export DB | `Ctrl+E` |
| Import DB | `Ctrl+I` |
| Quit | `Ctrl+Q` |
| Zoom In | `Ctrl++` |
| Zoom Out | `Ctrl+-` |
| Reset Zoom | `Ctrl+0` |

---

## 🌍 Multi-Language Support

Toggle between **English** and **Arabic** (RTL):
- Click the `عربي / EN` button in the header
- Or go to Settings → Language
- The setting is persisted via `electron-store`
- RTL layout switches automatically via `dir="rtl"` on `<html>`
- The app menu rebuilds in the selected language

---

## 🎨 Dark / Light Mode

Toggle via:
- The moon/sun button in the header
- Settings → Appearance

Implemented with CSS custom properties (`--bg-primary`, `--text-primary`, etc.) that remap on `[data-theme="dark"]`.

---

## 📤 Database Backup & Restore

### Export
File → Export Database (or Settings → Backup)  
Saves a copy of `database.db` to a location you choose.

### Import
File → Import Database  
Replaces the current database with a backup file.  
⚠️ App restarts automatically after import.

---

## 🔧 Adding the `generate-icon.js` Script

Create `scripts/generate-icon.js`:
```js
const { createCanvas } = require('canvas');
const fs = require('fs');

const canvas = createCanvas(512, 512);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#2D7EF8';
ctx.fillRect(0, 0, 512, 512);
ctx.fillStyle = '#fff';
ctx.font = 'bold 300px serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('🏛', 256, 256);

fs.mkdirSync('assets', { recursive: true });
fs.writeFileSync('assets/icon.png', canvas.toBuffer('image/png'));
console.log('Icon generated → assets/icon.png');
```

Then: `npm install canvas && node scripts/generate-icon.js`

---

## 🧪 Troubleshooting

### `better-sqlite3` build error
```bash
npm install --save-dev electron-rebuild
npx electron-rebuild
```

### App shows blank screen in production
Make sure `react-app/build/` exists:
```bash
cd react-app && npm run build
```

### Database not found
The DB is auto-created on first launch. If you need to reset:
- Delete `database.db` from the userData path (see above)
- Relaunch the app — demo data will be reseeded

### Windows Defender / SmartScreen blocks the installer
This happens with unsigned apps. Click "More info" → "Run anyway".  
For production, sign the executable with a code signing certificate.

---

## 🚀 Roadmap / Future Enhancements

- [ ] Telegram bot integration for payment reminders
- [ ] AI-powered late payment prediction
- [ ] Multi-owner (multi-user) accounts
- [ ] Export reports to PDF/Excel
- [ ] Auto-update via `electron-updater`
- [ ] Print receipts natively
- [ ] WhatsApp notification integration

---

## 📝 License
MIT — Free to use and modify.
