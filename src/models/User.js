// ============================================================
//  src/models/User.js
//  Modelo de usuarios — consultas a la BD
// ============================================================

'use strict';

const db = require('../config/db');

const User = {

  /** Busca usuario por email */
  async findByEmail(email) {
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND activo = 1 LIMIT 1',
      [email]
    );
    return rows[0] || null;
  },

  /** Busca usuario por ID */
  async findById(id) {
    const [rows] = await db.query(
      `SELECT id_usuario, nombre, apellido, email, telefono, rol,
              foto_perfil, fcm_token, activo, ultimo_acceso, created_at
       FROM usuarios WHERE id_usuario = ? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  /** Crear nuevo usuario */
  async create({ nombre, apellido, email, telefono, password_hash, rol }) {
    const [result] = await db.query(
      `INSERT INTO usuarios (nombre, apellido, email, telefono, password_hash, rol)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nombre, apellido, email, telefono || null, password_hash, rol]
    );
    return result.insertId;
  },

  /** Actualizar último acceso */
  async updateLastAccess(id) {
    await db.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?',
      [id]
    );
  },

  /** Actualizar FCM token */
  async updateFcmToken(id, token) {
    await db.query(
      'UPDATE usuarios SET fcm_token = ? WHERE id_usuario = ?',
      [token, id]
    );
  },

  /** Actualizar perfil */
  async updateProfile(id, { nombre, apellido, telefono, foto_perfil }) {
    await db.query(
      `UPDATE usuarios SET nombre=?, apellido=?, telefono=?, foto_perfil=?
       WHERE id_usuario=?`,
      [nombre, apellido, telefono || null, foto_perfil || null, id]
    );
  },

  /** Cambiar contraseña */
  async updatePassword(id, password_hash) {
    await db.query(
      'UPDATE usuarios SET password_hash=? WHERE id_usuario=?',
      [password_hash, id]
    );
  },

  /** Listar usuarios con paginación (admin) */
  async list({ rol = null, page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    let where = 'WHERE u.activo = 1';
    const params = [];

    if (rol) { where += ' AND u.rol = ?'; params.push(rol); }
    if (search) {
      where += ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const [rows] = await db.query(
      `SELECT id_usuario, nombre, apellido, email, rol, activo, created_at
       FROM usuarios u ${where}
       ORDER BY nombre ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM usuarios u ${where}`,
      params
    );

    return { rows, total };
  },

  /** Desactivar / activar usuario */
  async setActive(id, activo) {
    await db.query('UPDATE usuarios SET activo=? WHERE id_usuario=?', [activo, id]);
  },

  /** Guardar refresh token */
  async saveRefreshToken(id_usuario, token, expira_en) {
    await db.query(
      'INSERT INTO refresh_tokens (id_usuario, token, expira_en) VALUES (?,?,?)',
      [id_usuario, token, expira_en]
    );
  },

  /** Buscar refresh token activo */
  async findRefreshToken(token) {
    const [rows] = await db.query(
      `SELECT * FROM refresh_tokens
       WHERE token=? AND revocado=0 AND expira_en > NOW() LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  },

  /** Revocar refresh token */
  async revokeRefreshToken(token) {
    await db.query(
      'UPDATE refresh_tokens SET revocado=1 WHERE token=?',
      [token]
    );
  },

  /** Revocar todos los refresh tokens de un usuario */
  async revokeAllRefreshTokens(id_usuario) {
    await db.query(
      'UPDATE refresh_tokens SET revocado=1 WHERE id_usuario=?',
      [id_usuario]
    );
  },

  /** Obtener tokens FCM de todos los usuarios activos para multicast */
  async getFcmTokensByRole(rol) {
    const [rows] = await db.query(
      'SELECT fcm_token FROM usuarios WHERE rol=? AND activo=1 AND fcm_token IS NOT NULL',
      [rol]
    );
    return rows.map(r => r.fcm_token);
  },
};

module.exports = User;