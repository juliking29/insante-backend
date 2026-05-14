// ============================================================
//  src/models/Mensaje.js
//  Modelo de mensajería interna
// ============================================================

'use strict';

const db = require('../config/db');

const Mensaje = {

  async create({ asunto, contenido, id_remitente, id_destinatario, archivo_adjunto }) {
    const [result] = await db.query(
      `INSERT INTO mensajes (asunto, contenido, id_remitente, id_destinatario, archivo_adjunto)
       VALUES (?,?,?,?,?)`,
      [asunto, contenido, id_remitente, id_destinatario, archivo_adjunto || null]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT m.*,
              r.nombre AS remitente_nombre, r.apellido AS remitente_apellido,
              d.nombre AS destinatario_nombre, d.apellido AS destinatario_apellido
       FROM mensajes m
       JOIN usuarios r ON r.id_usuario = m.id_remitente
       JOIN usuarios d ON d.id_usuario = m.id_destinatario
       WHERE m.id_mensaje = ? AND m.eliminado_remitente = 0 AND m.eliminado_destinatario = 0
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /** Bandeja de entrada */
  async inbox({ id_usuario, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT m.id_mensaje, m.asunto, m.leido, m.leido_en, m.guardado,
              m.archivo_adjunto, m.created_at,
              r.nombre AS remitente_nombre, r.apellido AS remitente_apellido,
              r.foto_perfil AS remitente_foto
       FROM mensajes m
       JOIN usuarios r ON r.id_usuario = m.id_remitente
       WHERE m.id_destinatario = ? AND m.eliminado_destinatario = 0
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [id_usuario, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM mensajes
       WHERE id_destinatario=? AND eliminado_destinatario=0`,
      [id_usuario]
    );

    return { rows, total };
  },

  /** Mensajes enviados */
  async sent({ id_usuario, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT m.id_mensaje, m.asunto, m.leido, m.created_at,
              d.nombre AS destinatario_nombre, d.apellido AS destinatario_apellido
       FROM mensajes m
       JOIN usuarios d ON d.id_usuario = m.id_destinatario
       WHERE m.id_remitente=? AND m.eliminado_remitente=0
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [id_usuario, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM mensajes WHERE id_remitente=? AND eliminado_remitente=0`,
      [id_usuario]
    );

    return { rows, total };
  },

  /** Mensajes guardados */
  async saved({ id_usuario, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const [rows] = await db.query(
      `SELECT m.id_mensaje, m.asunto, m.created_at,
              r.nombre AS remitente_nombre, r.apellido AS remitente_apellido
       FROM mensajes m
       JOIN usuarios r ON r.id_usuario = m.id_remitente
       WHERE m.id_destinatario=? AND m.guardado=1 AND m.eliminado_destinatario=0
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`,
      [id_usuario, limit, offset]
    );
    return { rows };
  },

  async markRead(id, id_usuario) {
    await db.query(
      `UPDATE mensajes SET leido=1, leido_en=NOW()
       WHERE id_mensaje=? AND id_destinatario=?`,
      [id, id_usuario]
    );
  },

  async toggleSaved(id, id_usuario, guardado) {
    await db.query(
      `UPDATE mensajes SET guardado=? WHERE id_mensaje=? AND id_destinatario=?`,
      [guardado ? 1 : 0, id, id_usuario]
    );
  },

  async deleteForUser(id, id_usuario, campo) {
    await db.query(
      `UPDATE mensajes SET ${campo}=1 WHERE id_mensaje=?`, [id]
    );
  },

  /** Contar mensajes no leídos */
  async countUnread(id_usuario) {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM mensajes
       WHERE id_destinatario=? AND leido=0 AND eliminado_destinatario=0`,
      [id_usuario]
    );
    return total;
  },
};

module.exports = Mensaje;