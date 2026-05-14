// ============================================================
//  src/controllers/usuariosController.js
//  Gestión de usuarios, perfil y relaciones
// ============================================================

'use strict';

const bcrypt = require('bcryptjs');
const User   = require('../models/User');
const Curso  = require('../models/Curso');
const db     = require('../config/db');
const res$   = require('../views/response');
const { validationResult } = require('express-validator');

const usuariosController = {

  /** GET /usuarios  — Solo admin */
  async list(req, res) {
    try {
      const { rol, page = 1, limit = 20, search = '' } = req.query;
      const { rows, total } = await User.list({ rol, page: +page, limit: +limit, search });
      return res$.paginated(res, { data: rows, total, page, limit });
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /usuarios/:id */
  async getOne(req, res) {
    try {
      const user = await User.findById(+req.params.id);
      if (!user) return res$.notFound(res, 'Usuario no encontrado');
      return res$.ok(res, user);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /usuarios/me — Perfil propio */
  async me(req, res) {
    try {
      const user = await User.findById(req.user.id_usuario);
      if (!user) return res$.notFound(res, 'Usuario no encontrado');

      // Enriquecer con cursos según rol
      let id_cursos = [];
      if (user.rol === 'acudiente')  id_cursos = await Curso.getIdsByAcudiente(user.id_usuario);
      if (user.rol === 'estudiante') id_cursos = await Curso.getIdsByEstudiante(user.id_usuario);
      if (user.rol === 'docente')    id_cursos = await Curso.getIdsByDocente(user.id_usuario);

      // Si es acudiente, agregar info de sus hijos
      let estudiantes = [];
      if (user.rol === 'acudiente') {
        const [rows] = await db.query(
          `SELECT u.id_usuario, u.nombre, u.apellido, u.foto_perfil,
                  ae.parentesco, c.nombre AS curso_actual
           FROM acudiente_estudiante ae
           JOIN usuarios u ON u.id_usuario = ae.id_estudiante
           LEFT JOIN estudiantes_cursos ec ON ec.id_estudiante = ae.id_estudiante AND ec.activo=1
           LEFT JOIN cursos c ON c.id_curso = ec.id_curso
           WHERE ae.id_acudiente=? AND ae.activo=1`,
          [user.id_usuario]
        );
        estudiantes = rows;
      }

      return res$.ok(res, { ...user, id_cursos, estudiantes });
    } catch (err) {
      return res$.error(res);
    }
  },

  /** PUT /usuarios/me — Actualizar mi perfil */
  async updateMe(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const { nombre, apellido, telefono } = req.body;
      const foto_perfil = req.file ? req.file.filename : null;

      // Obtener perfil actual para no sobreescribir foto si no viene nueva
      const current = await User.findById(req.user.id_usuario);
      await User.updateProfile(req.user.id_usuario, {
        nombre, apellido, telefono,
        foto_perfil: foto_perfil || current.foto_perfil,
      });

      return res$.ok(res, null, 'Perfil actualizado');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** PUT /usuarios/me/password */
  async changePassword(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const { password_actual, password_nueva } = req.body;
      const user = await User.findByEmail(req.user.email);

      const match = await bcrypt.compare(password_actual, user.password_hash);
      if (!match) return res$.badRequest(res, 'La contraseña actual es incorrecta');

      const hash = await bcrypt.hash(password_nueva, 10);
      await User.updatePassword(req.user.id_usuario, hash);

      // Revocar todos los refresh tokens por seguridad
      await User.revokeAllRefreshTokens(req.user.id_usuario);

      return res$.ok(res, null, 'Contraseña cambiada. Por favor inicia sesión de nuevo.');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** PATCH /usuarios/me/fcm  — Actualizar token push */
  async updateFcm(req, res) {
    try {
      const { fcm_token } = req.body;
      if (!fcm_token) return res$.badRequest(res, 'fcm_token requerido');
      await User.updateFcmToken(req.user.id_usuario, fcm_token);
      return res$.ok(res, null, 'Token de notificaciones actualizado');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** PATCH /usuarios/:id/estado  — Admin activa/desactiva */
  async setActive(req, res) {
    try {
      const { activo } = req.body;
      await User.setActive(+req.params.id, activo ? 1 : 0);
      return res$.ok(res, null, activo ? 'Usuario activado' : 'Usuario desactivado');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** POST /usuarios/vincular-acudiente  — Admin vincula acudiente con estudiante */
  async vincularAcudiente(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const { id_acudiente, id_estudiante, parentesco } = req.body;

      await db.query(
        `INSERT INTO acudiente_estudiante (id_acudiente, id_estudiante, parentesco)
         VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE activo=1, parentesco=VALUES(parentesco)`,
        [id_acudiente, id_estudiante, parentesco || null]
      );

      return res$.created(res, null, 'Acudiente vinculado al estudiante');
    } catch (err) {
      return res$.error(res);
    }
  },
};

module.exports = usuariosController;