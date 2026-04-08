'use strict';

const { getDb } = require('../init');

const ContractRepository = {

  getAll() {
    const db = getDb();
    return db.prepare(`
      SELECT
        c.*,
        t.name   as tenant_name,
        t.name_ar as tenant_name_ar,
        u.unit_number,
        p.name   as property_name,
        CASE
          WHEN c.expiry_date IS NULL THEN 'active'
          WHEN date(c.expiry_date) < date('now') THEN 'expired'
          WHEN date(c.expiry_date) <= date('now', '+30 days') THEN 'expiring_soon'
          ELSE 'active'
        END as contract_status
      FROM contracts c
      JOIN tenants t ON t.id = c.tenant_id
      LEFT JOIN units u ON u.id = t.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      ORDER BY c.created_at DESC
    `).all();
  },

  getById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT c.*, t.name as tenant_name, u.unit_number, p.name as property_name
      FROM contracts c
      JOIN tenants t ON t.id = c.tenant_id
      LEFT JOIN units u ON u.id = t.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      WHERE c.id = ?
    `).get(id);
  },

  getByTenant(tenantId) {
    const db = getDb();
    return db.prepare(`SELECT * FROM contracts WHERE tenant_id = ? ORDER BY upload_date DESC`).all(tenantId);
  },

  create(data) {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO contracts (tenant_id, file_name, file_path, upload_date, start_date, expiry_date, rent_amount, notes)
      VALUES (@tenant_id, @file_name, @file_path, @upload_date, @start_date, @expiry_date, @rent_amount, @notes)
    `).run({
      file_name: null, file_path: null, upload_date: new Date().toISOString().slice(0, 10),
      start_date: null, expiry_date: null, rent_amount: null, notes: null,
      ...data
    });

    const tenant = db.prepare(`SELECT name FROM tenants WHERE id = ?`).get(data.tenant_id);
    db.prepare(`INSERT INTO activity_log (type, message, message_ar, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)`)
      .run('contract_uploaded', `Contract uploaded for ${tenant?.name}`, `تم رفع عقد لـ ${tenant?.name}`, result.lastInsertRowid, 'contract');

    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const db = getDb();
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE contracts SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
    return this.getById(id);
  },

  delete(id) {
    const db = getDb();
    db.prepare(`DELETE FROM contracts WHERE id = ?`).run(id);
    return { success: true };
  }
};

module.exports = ContractRepository;
