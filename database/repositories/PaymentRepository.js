'use strict';

const { getDb } = require('../init');

const PaymentRepository = {

  getAll() {
    const db = getDb();
    return db.prepare(`
      SELECT
        pay.*,
        t.name  as tenant_name,
        t.name_ar as tenant_name_ar,
        u.unit_number,
        p.name  as property_name
      FROM payments pay
      JOIN tenants t ON t.id = pay.tenant_id
      LEFT JOIN units u ON u.id = t.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      ORDER BY pay.date DESC, pay.created_at DESC
    `).all();
  },

  getById(id) {
    const db = getDb();
    return db.prepare(`
      SELECT pay.*, t.name as tenant_name, u.unit_number, p.name as property_name
      FROM payments pay
      JOIN tenants t ON t.id = pay.tenant_id
      LEFT JOIN units u ON u.id = t.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      WHERE pay.id = ?
    `).get(id);
  },

  getByTenant(tenantId) {
    const db = getDb();
    return db.prepare(`SELECT * FROM payments WHERE tenant_id = ? ORDER BY date DESC`).all(tenantId);
  },

  create(data) {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO payments (tenant_id, amount, type, status, date, due_date, notes)
      VALUES (@tenant_id, @amount, @type, @status, @date, @due_date, @notes)
    `).run({ type: 'rent', status: 'paid', due_date: null, notes: null, ...data });

    const tenant = db.prepare(`SELECT name, name_ar FROM tenants WHERE id = ?`).get(data.tenant_id);
    this._logActivity(
      db, 'payment_recorded',
      `Payment of JD ${data.amount} recorded for ${tenant?.name}`,
      `تم تسجيل دفعة ${data.amount} دينار لـ ${tenant?.name_ar || tenant?.name}`,
      result.lastInsertRowid, 'payment'
    );
    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const db = getDb();
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE payments SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
    return this.getById(id);
  },

  delete(id) {
    const db = getDb();
    db.prepare(`DELETE FROM payments WHERE id = ?`).run(id);
    return { success: true };
  },

  getOverdue() {
    const db = getDb();
    return db.prepare(`
      SELECT pay.*, t.name as tenant_name, u.unit_number, p.name as property_name
      FROM payments pay
      JOIN tenants t ON t.id = pay.tenant_id
      LEFT JOIN units u ON u.id = t.unit_id
      LEFT JOIN properties p ON p.id = u.property_id
      WHERE pay.status = 'overdue'
      ORDER BY pay.date ASC
    `).all();
  },

  getMonthlyStats() {
    const db = getDb();
    // Last 6 months
    return db.prepare(`
      SELECT
        strftime('%Y-%m', date)          as month,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type NOT IN ('rent') AND status = 'paid' THEN amount ELSE 0 END) as expenses,
        COUNT(*)                          as count
      FROM payments
      WHERE date >= date('now', '-6 months')
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `).all();
  },

  getRecentActivity(limit = 10) {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM activity_log
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);
  },

  getSummary() {
    const db = getDb();
    return db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN status = 'paid'    THEN amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(CASE WHEN status = 'overdue' THEN amount ELSE 0 END), 0) as total_overdue,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
      FROM payments
      WHERE date >= date('now', 'start of year')
    `).get();
  },

  _logActivity(db, type, message, messageAr, entityId, entityType) {
    db.prepare(`INSERT INTO activity_log (type, message, message_ar, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)`)
      .run(type, message, messageAr, entityId, entityType);
  }
};

module.exports = PaymentRepository;
