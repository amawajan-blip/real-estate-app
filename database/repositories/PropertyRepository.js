'use strict';

const { getDb } = require('../init');

const PropertyRepository = {

  getAll() {
    const db = getDb();
    const props = db.prepare(`
      SELECT p.*,
        COUNT(DISTINCT u.id) as total_units,
        SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
        SUM(CASE WHEN u.status = 'vacant'   THEN 1 ELSE 0 END) as vacant_units
      FROM properties p
      LEFT JOIN units u ON u.property_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `).all();
    return props;
  },

  getById(id) {
    const db = getDb();
    const prop = db.prepare(`SELECT * FROM properties WHERE id = ?`).get(id);
    if (!prop) return null;
    prop.units = this.getUnits(id);
    return prop;
  },

  create(data) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO properties (name, name_ar, location, type, description, image)
      VALUES (@name, @name_ar, @location, @type, @description, @image)
    `);
    const result = stmt.run({ image: '🏢', ...data });
    this._logActivity(db, 'property_created', `Property "${data.name}" created`, `تم إنشاء عقار "${data.name_ar || data.name}"`, result.lastInsertRowid, 'property');
    return this.getById(result.lastInsertRowid);
  },

  update(id, data) {
    const db = getDb();
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE properties SET ${fields}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...data, id });
    return this.getById(id);
  },

  delete(id) {
    const db = getDb();
    const prop = this.getById(id);
    db.prepare(`DELETE FROM properties WHERE id = ?`).run(id);
    this._logActivity(db, 'property_deleted', `Property "${prop?.name}" deleted`, null, id, 'property');
    return { success: true };
  },

  getStats() {
    const db = getDb();
    return db.prepare(`
      SELECT
        COUNT(DISTINCT p.id)                                    as total_properties,
        COUNT(u.id)                                             as total_units,
        SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) as occupied_units,
        SUM(CASE WHEN u.status = 'vacant'   THEN 1 ELSE 0 END) as vacant_units,
        ROUND(
          CASE WHEN COUNT(u.id) > 0
          THEN (SUM(CASE WHEN u.status = 'occupied' THEN 1 ELSE 0 END) * 100.0 / COUNT(u.id))
          ELSE 0 END, 1
        ) as occupancy_rate
      FROM properties p
      LEFT JOIN units u ON u.property_id = p.id
    `).get();
  },

  // Units
  getUnits(propertyId) {
    const db = getDb();
    return db.prepare(`
      SELECT u.*, t.name as tenant_name, t.id as tenant_id
      FROM units u
      LEFT JOIN tenants t ON t.unit_id = u.id AND t.is_primary = 1
      WHERE u.property_id = ?
      ORDER BY u.floor ASC, u.unit_number ASC
    `).all(propertyId);
  },

  createUnit(data) {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO units (property_id, unit_number, floor, area_sqm, rent_amount, status)
      VALUES (@property_id, @unit_number, @floor, @area_sqm, @rent_amount, @status)
    `).run({ floor: 0, area_sqm: null, rent_amount: 0, status: 'vacant', ...data });
    return db.prepare(`SELECT * FROM units WHERE id = ?`).get(result.lastInsertRowid);
  },

  updateUnit(id, data) {
    const db = getDb();
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ');
    db.prepare(`UPDATE units SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...data, id });
    return db.prepare(`SELECT * FROM units WHERE id = ?`).get(id);
  },

  deleteUnit(id) {
    const db = getDb();
    db.prepare(`DELETE FROM units WHERE id = ?`).run(id);
    return { success: true };
  },

  _logActivity(db, type, message, messageAr, entityId, entityType) {
    db.prepare(`INSERT INTO activity_log (type, message, message_ar, entity_id, entity_type) VALUES (?, ?, ?, ?, ?)`)
      .run(type, message, messageAr, entityId, entityType);
  }
};

module.exports = PropertyRepository;
