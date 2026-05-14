// ============================================================
//  ARCHIVO: src/models/Lectura.js  — VERSIÓN CORREGIDA
//  Cambios: id_notificacion → id_notif, eliminado referencia_tipo
// ============================================================

'use strict';

const db = require('../config/db');

const Lectura = {

  async saveNotification({ id_usuario, tipo, titulo, cuerpo, referencia_id }) {
    const [result] = await db.query(
      `INSERT INTO notificaciones (id_usuario, tipo, titulo, cuerpo, referencia_id)
       VALUES (?,?,?,?,?)`,
      [id_usuario, tipo, titulo, cuerpo || null, referencia_id || null]
    );
    return result.insertId;
  },

  async listByUser({ id_usuario, page = 1, limit = 30 }) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT id_notif, tipo, titulo, cuerpo, leida, referencia_id, created_at
       FROM notificaciones
       WHERE id_usuario=?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [id_usuario, limit, offset]
    );

    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM notificaciones WHERE id_usuario=?',
      [id_usuario]
    );

    const [[{ unread }]] = await db.query(
      'SELECT COUNT(*) AS unread FROM notificaciones WHERE id_usuario=? AND leida=0',
      [id_usuario]
    );

    return { rows, total, unread };
  },

  async markRead(id_notif, id_usuario) {
    await db.query(
      `UPDATE notificaciones SET leida=1, leida_en=NOW()
       WHERE id_notif=? AND id_usuario=?`,
      [id_notif, id_usuario]
    );
  },

  async markAllRead(id_usuario) {
    await db.query(
      'UPDATE notificaciones SET leida=1, leida_en=NOW() WHERE id_usuario=? AND leida=0',
      [id_usuario]
    );
  },

  async getConfig(id_usuario) {
    const [rows] = await db.query(
      'SELECT * FROM config_notificaciones WHERE id_usuario=? LIMIT 1',
      [id_usuario]
    );
    return rows[0] || null;
  },

  async updateConfig(id_usuario, config) {
    const { avisos_push, tareas_push, actividades_push, mensajes_push,
            recordatorios_push, hora_inicio_quiet, hora_fin_quiet } = config;

    await db.query(
      `INSERT INTO config_notificaciones
         (id_usuario, avisos_push, tareas_push, actividades_push, mensajes_push,
          recordatorios_push, hora_inicio_quiet, hora_fin_quiet)
       VALUES (?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         avisos_push=VALUES(avisos_push),
         tareas_push=VALUES(tareas_push),
         actividades_push=VALUES(actividades_push),
         mensajes_push=VALUES(mensajes_push),
         recordatorios_push=VALUES(recordatorios_push),
         hora_inicio_quiet=VALUES(hora_inicio_quiet),
         hora_fin_quiet=VALUES(hora_fin_quiet)`,
      [id_usuario,
       avisos_push !== undefined ? avisos_push : 1,
       tareas_push !== undefined ? tareas_push : 1,
       actividades_push !== undefined ? actividades_push : 1,
       mensajes_push !== undefined ? mensajes_push : 1,
       recordatorios_push !== undefined ? recordatorios_push : 1,
       hora_inicio_quiet || null,
       hora_fin_quiet    || null]
    );
  },

  async getAgendaAcudiente(id_acudiente) {
    const [rows] = await db.query(
      `SELECT tipo, referencia_id, titulo, contenido, prioridad, fecha_limite,
              curso, materia, created_at
       FROM v_agenda_acudiente
       WHERE id_acudiente=?
       ORDER BY FIELD(prioridad,'alta','media','baja'), fecha_limite ASC`,
      [id_acudiente]
    );
    return rows;
  },

  async getPendientes(id_usuario) {
    const [rows] = await db.query(
      `SELECT id_pendiente, tipo, referencia_id, titulo, fecha_limite,
              completado, created_at,
              DATEDIFF(fecha_limite, CURRENT_DATE) AS dias_restantes
       FROM pendientes
       WHERE id_usuario=? AND completado=0
         AND (fecha_limite IS NULL OR fecha_limite >= CURRENT_DATE)
       ORDER BY fecha_limite ASC`,
      [id_usuario]
    );
    return rows;
  },

  async completePendiente(id_pendiente, id_usuario) {
    await db.query(
      `UPDATE pendientes SET completado=1, completado_en=NOW()
       WHERE id_pendiente=? AND id_usuario=?`,
      [id_pendiente, id_usuario]
    );
  },

  async addPendiente({ id_usuario, tipo, referencia_id, titulo, fecha_limite }) {
    await db.query(
      `INSERT INTO pendientes (id_usuario, tipo, referencia_id, titulo, fecha_limite)
       VALUES (?,?,?,?,?)`,
      [id_usuario, tipo, referencia_id, titulo, fecha_limite || null]
    );
  },
};

module.exports = Lectura;

// ============================================================
// FIN Lectura.js
// ============================================================


// ============================================================
//  ARCHIVO: src/controllers/notifController.js — VERSIÓN COMPLETA
//  El archivo estaba vacío. Aquí va el contenido completo:
// ============================================================

// (Ver archivo notifController.js separado en esta entrega)


// ============================================================
//  ARCHIVO: src/routes/notificaciones.routes.js — VERSIÓN CORREGIDA
//  Usa el controller en vez de handlers inline
// ============================================================

// (Ver archivo notificaciones.routes.js separado en esta entrega)