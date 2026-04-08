'use strict';

const { getDb } = require('../init');

const TenantRepository = {

  getAll() {
    const db = getDb();
    return db.prepare(`
      SELECT
        t.*,
        u.unit_number,
        u.rent_amount,
        p.name  as property_name,
        p.id    as property_id,
        COALESCE((
          SELECT SUM(CASE WHEN pay.status = 'overdue' THEN pay.amount * -1
                         WHEN pay.status = 'paid'    THEN 0
                         ELSE pay.amount END)
          FROM payments pay WHERE pay.tenant_id = t.id
        ), 0) as balance
      FROM tenants t
      LEFT JOIN units u ON u.id = t.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      ORDER BY t.created_at DESC
    `).all();
  },

  getById(id) {
    const db = getDb();
    const tenant = db.prepare(`
      SELECT t.*, u.unit_number, u.rent_amount, p.name as property_name, p.id as property_id
      FROM tenants t
      LEFT JOIN units u ON u.id = t.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      WHERE t.id = ?
    `).get(id);
    if (!tenant) return null;
    tenant.payments = db.prepare(`SELECT * FROM payments WHERE tenant_id = ? ORDER BY date DESC LIMIT 20`).all(id);
    tenant.contracts = db.prepare(`SELECT * FROM contracts WHERE tenant_id = ? ORDER BY upload_date DESC`).all(id);
    return tenant;
  },

  getByUnit(unitId) {
    const db = getDb();
    return db.prepare(`SELECT * FROM tenants WHERE unit_id = ? ORDER BY is_primary DESC`).all(unitId);
  },

  create(data) {
    const db = getDb();

    // If primary tenant, check for existing primary in that unit
    if (data.unit_id && data.is_primary) {
      const existing = db.prepare(`SELECT id FROM tenants WHERE unit_id = ? AND is_primary = 1`).get(data.unit_id);
      if (existing) {
        db.prepare(`UPDATE tenants SET is_primary = 0 WHERE id = ?`).run(existing.id);
      }
      // Mark unit as occupied
      db.prepare(`UPDATE units SET status = 'occupied', updated_at = datetime('now') WHERE id = ?`).run(data.unit_id);
    }

    const result = db.prepare(`
      INSERT INTO tenants (name, name_ar, phone, email, national_id, unit_id, is_primary, move_in_date, notes)
      VALUES (@name, @name_ar, @phone, @email, @national_id, @unit_id, @is_primary, @move_in_date, @notes)
    `).run({ name_ar: null, phone: null, email: null, national_id: null, unit_id: null, is_primary: 1, move_in_date: null, notes: null, ...data });

    this._logActivity(db, 'tenant_added', `Tenant "${data.name}" added`, `تم إضافة مستأجر "${data.name_ar || data.name}"`, result.lastInsertRowid, 'tenant');
    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const db = getDb();

    if (data.unit_id) {
      const current = db.prepare(`SELECT unit_id FROM tenants WHERE id = ?`).get(id);
      // Free old unit if changed
      if (current?.unit_id && current.unit_id !== data.unit_id) {
        const othersInOldUnit = db.prepare(`SELECT COUNT(*) as c FROM tenants WHERE unit_id = ? AND id != ?`).get(current.unit_id, id);
        if (othersInOldUnit.c === 0) {
          db.prepare(`UPDATE units SET status = 'vacant', updated_at = datetime('now') WHERE id = ?`).run(current.unit_id);
        }
      }
      // Mark new unit occupied
      if (data.is_primary !== 0) {
        db.prepare(`UPDATE units SET status = 'occupied', updated_at = datetime('now') WHERE id = ?`).run(data.unit_id);
      }
    }

    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE tenants SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
    return this.getById(id);
  },

  delete(id) {
    const db = getDb();
    const tenant = this.getById(id);

    // Free the unit if this was the last tenant
    if (tenant?.unit_id) {
      const others = db.prepare(`SELECT COUNT(*) as c FROM tenants WHERE unit_id = ? AND id != ?`).get(tenant.unit_id, id);
      if (others.c === 0) {
        db.prepare(`UPDATE units SET status = 'vacant', updated_at = datetime('now') WHERE id = ?`).run(tenant.unit_id);
      }
    }

    db.prepare(`DELETE FROM tenants WHERE id = ?`).run(id);
    this._logActivity(db, 'tenant_removed', `Tenant "${tenant?.name}" removed`, null, id, 'tenant');
    return { success: true };
  },

  _logActivity(db, type, message, messageAr, entityId, entityType) {
    db.prepare(`INSERT INTO activity_log (type, message, message_ar, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)`)
      .run(type, message, messageAr, entityId, entityType);
  }
};

module.exports = TenantRepository;
