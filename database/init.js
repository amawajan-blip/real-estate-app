'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db = null;

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'database.db');
  console.log('[DB] Initializing at:', dbPath);

  db = new Database(dbPath, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 10000');
  db.pragma('temp_store = MEMORY');

  // ── Create Tables ────────────────────────────────────────────────────────────

  db.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      name_ar     TEXT,
      location    TEXT,
      type        TEXT    DEFAULT 'Residential',
      description TEXT,
      image       TEXT    DEFAULT '🏢',
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS units (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      property_id INTEGER NOT NULL,
      unit_number TEXT    NOT NULL,
      floor       INTEGER DEFAULT 0,
      area_sqm    REAL,
      rent_amount REAL    DEFAULT 0,
      status      TEXT    DEFAULT 'vacant',
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      name_ar     TEXT,
      phone       TEXT,
      email       TEXT,
      national_id TEXT,
      unit_id     INTEGER,
      is_primary  INTEGER DEFAULT 1,
      move_in_date TEXT,
      notes       TEXT,
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id   INTEGER NOT NULL,
      amount      REAL    NOT NULL,
      type        TEXT    DEFAULT 'rent',
      status      TEXT    DEFAULT 'paid',
      date        TEXT    NOT NULL,
      due_date    TEXT,
      notes       TEXT,
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id   INTEGER NOT NULL,
      file_name   TEXT,
      file_path   TEXT,
      upload_date TEXT    DEFAULT (date('now')),
      start_date  TEXT,
      expiry_date TEXT,
      rent_amount REAL,
      notes       TEXT,
      created_at  TEXT    DEFAULT (datetime('now')),
      updated_at  TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      type        TEXT    NOT NULL,
      message     TEXT    NOT NULL,
      message_ar  TEXT,
      entity_id   INTEGER,
      entity_type TEXT,
      created_at  TEXT    DEFAULT (datetime('now'))
    );
  `);

  // ── Indexes ──────────────────────────────────────────────────────────────────
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_units_property    ON units(property_id);
    CREATE INDEX IF NOT EXISTS idx_tenants_unit      ON tenants(unit_id);
    CREATE INDEX IF NOT EXISTS idx_payments_tenant   ON payments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_payments_date     ON payments(date);
    CREATE INDEX IF NOT EXISTS idx_contracts_tenant  ON contracts(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_activity_created  ON activity_log(created_at);
  `);

  // ── Seed demo data if empty ──────────────────────────────────────────────────
  const count = db.prepare('SELECT COUNT(*) as c FROM properties').get();
  if (count.c === 0) seedDemoData(db);

  console.log('[DB] Ready.');
  return db;
}

function seedDemoData(db) {
  console.log('[DB] Seeding demo data...');

  const insertProperty = db.prepare(`INSERT INTO properties (name, name_ar, location, type, image) VALUES (?, ?, ?, ?, ?)`);
  const insertUnit = db.prepare(`INSERT INTO units (property_id, unit_number, floor, rent_amount, status) VALUES (?, ?, ?, ?, ?)`);
  const insertTenant = db.prepare(`INSERT INTO tenants (name, name_ar, phone, email, unit_id, is_primary, move_in_date) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const insertPayment = db.prepare(`INSERT INTO payments (tenant_id, amount, type, status, date) VALUES (?, ?, ?, ?, ?)`);
  const insertContract = db.prepare(`INSERT INTO contracts (tenant_id, file_name, upload_date, start_date, expiry_date, rent_amount) VALUES (?, ?, ?, ?, ?, ?)`);

  const seedAll = db.transaction(() => {
    // Properties
    const p1 = insertProperty.run('Sunset Tower', 'برج الغروب', 'Amman, Jordan', 'Residential', '🏢').lastInsertRowid;
    const p2 = insertProperty.run('Green Villa', 'فيلا الخضراء', 'Zarqa, Jordan', 'Commercial', '🏡').lastInsertRowid;
    const p3 = insertProperty.run('Blue Heights', 'بلو هايتس', 'Irbid, Jordan', 'Mixed', '🏗').lastInsertRowid;

    // Units for p1
    const u1 = insertUnit.run(p1, '3A', 3, 500, 'occupied').lastInsertRowid;
    const u2 = insertUnit.run(p1, '5B', 5, 450, 'occupied').lastInsertRowid;
    const u3 = insertUnit.run(p1, '1C', 1, 380, 'vacant').lastInsertRowid;
    // Units for p2
    const u4 = insertUnit.run(p2, '1A', 1, 800, 'occupied').lastInsertRowid;
    const u5 = insertUnit.run(p2, '2B', 2, 750, 'vacant').lastInsertRowid;
    // Units for p3
    const u6 = insertUnit.run(p3, '2C', 2, 600, 'occupied').lastInsertRowid;
    const u7 = insertUnit.run(p3, '4D', 4, 550, 'occupied').lastInsertRowid;

    // Tenants
    const t1 = insertTenant.run('Ahmad Al-Hassan', 'أحمد الحسن', '+962 79 123 4567', 'ahmad@email.com', u1, 1, '2023-06-01').lastInsertRowid;
    const t2 = insertTenant.run('Sara Al-Nouri', 'سارة النوري', '+962 77 234 5678', 'sara@email.com', u2, 1, '2023-09-15').lastInsertRowid;
    const t3 = insertTenant.run('Khalid Mansour', 'خالد منصور', '+962 78 345 6789', 'khalid@email.com', u4, 1, '2023-03-01').lastInsertRowid;
    const t4 = insertTenant.run('Fatima Al-Jabri', 'فاطمة الجابري', '+962 79 456 7890', 'fatima@email.com', u6, 0, '2023-11-01').lastInsertRowid;

    // Payments
    insertPayment.run(t1, 500, 'rent', 'paid', '2024-01-15');
    insertPayment.run(t1, 75, 'electricity', 'paid', '2024-01-18');
    insertPayment.run(t2, 450, 'rent', 'overdue', '2024-01-10');
    insertPayment.run(t3, 800, 'rent', 'paid', '2024-01-20');
    insertPayment.run(t4, 600, 'rent', 'pending', '2024-01-05');
    insertPayment.run(t1, 500, 'rent', 'paid', '2023-12-15');
    insertPayment.run(t2, 450, 'rent', 'paid', '2023-12-12');
    insertPayment.run(t3, 800, 'rent', 'paid', '2023-12-20');
    insertPayment.run(t4, 600, 'rent', 'paid', '2023-12-05');

    // Contracts
    insertContract.run(t1, null, '2023-06-01', '2023-06-01', '2024-06-01', 500);
    insertContract.run(t2, null, '2023-09-15', '2023-09-15', '2024-09-15', 450);
    insertContract.run(t3, null, '2023-03-01', '2023-03-01', '2024-03-01', 800);
  });

  seedAll();
  console.log('[DB] Demo data seeded.');
}

module.exports = { initDatabase, getDb };
