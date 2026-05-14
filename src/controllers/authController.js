// ============================================================
//  src/controllers/authController.js
//  Registro, login, refresh y logout
// ============================================================

'use strict';

const bcrypt  = require('bcryptjs');
const User    = require('../models/User');
const Lectura = require('../models/Lectura');
const Curso   = require('../models/Curso');
const jwt     = require('../utils/jwt');
const res$    = require('../views/response');
const { validationResult } = require('express-validator');

const authController = {

  /** POST /auth/register */
  async register(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    const { nombre, apellido, email, telefono, password, rol } = req.body;

    try {
      const exists = await User.findByEmail(email);
      if (exists) return res$.badRequest(res, 'El email ya está registrado');

      // Solo admin puede crear admins
      if (rol === 'administrador' && (!req.user || req.user.rol !== 'administrador')) {
        return res$.forbidden(res, 'Solo un administrador puede crear otro administrador');
      }

      const password_hash = await bcrypt.hash(password, 10);
      const id_usuario    = await User.create({ nombre, apellido, email, telefono, password_hash, rol });

      // Config de notificaciones por defecto
      await Lectura.updateConfig(id_usuario, {});

      return res$.created(res, { id_usuario }, 'Usuario registrado correctamente');
    } catch (err) {
      console.error('register error:', err);
      return res$.error(res, 'Error al registrar usuario');
    }
  },

  /** POST /auth/login */
  async login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    const { email, password, fcm_token } = req.body;

    try {
      const user = await User.findByEmail(email);
      if (!user) return res$.unauthorized(res, 'Credenciales inválidas');
      if (!user.activo) return res$.unauthorized(res, 'Cuenta desactivada');

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) return res$.unauthorized(res, 'Credenciales inválidas');

      // Tokens
      const payload = { id_usuario: user.id_usuario, rol: user.rol, email: user.email };
      const accessToken  = jwt.signAccessToken(payload);
      const refreshToken = jwt.signRefreshToken({ id_usuario: user.id_usuario });
      const expiry       = jwt.refreshTokenExpiry();

      await User.saveRefreshToken(user.id_usuario, refreshToken, expiry);
      await User.updateLastAccess(user.id_usuario);

      // Actualizar FCM token si se envía
      if (fcm_token) await User.updateFcmToken(user.id_usuario, fcm_token);

      // Obtener cursos del usuario para devolver en login
      let id_cursos = [];
      if (user.rol === 'estudiante') {
        id_cursos = await Curso.getIdsByEstudiante(user.id_usuario);
      } else if (user.rol === 'acudiente') {
        id_cursos = await Curso.getIdsByAcudiente(user.id_usuario);
      } else if (user.rol === 'docente') {
        id_cursos = await Curso.getIdsByDocente(user.id_usuario);
      }

      return res$.ok(res, {
        accessToken,
        refreshToken,
        user: {
          id_usuario: user.id_usuario,
          nombre:     user.nombre,
          apellido:   user.apellido,
          email:      user.email,
          rol:        user.rol,
          foto_perfil:user.foto_perfil,
          id_cursos,
        },
      }, 'Inicio de sesión exitoso');
    } catch (err) {
      console.error('login error:', err);
      return res$.error(res, 'Error al iniciar sesión');
    }
  },

  /** POST /auth/refresh */
  async refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) return res$.badRequest(res, 'Refresh token requerido');

    try {
      // Verificar firma JWT primero
      const decoded = jwt.verifyRefreshToken(refreshToken);

      // Verificar en BD que no esté revocado
      const stored = await User.findRefreshToken(refreshToken);
      if (!stored) return res$.unauthorized(res, 'Refresh token inválido o revocado');

      const user = await User.findById(decoded.id_usuario);
      if (!user || !user.activo) return res$.unauthorized(res, 'Usuario no encontrado');

      const payload = { id_usuario: user.id_usuario, rol: user.rol, email: user.email };
      const newAccessToken = jwt.signAccessToken(payload);

      return res$.ok(res, { accessToken: newAccessToken }, 'Token renovado');
    } catch (err) {
      return res$.unauthorized(res, 'Refresh token inválido o expirado');
    }
  },

  /** POST /auth/logout */
  async logout(req, res) {
    const { refreshToken } = req.body;
    try {
      if (refreshToken) await User.revokeRefreshToken(refreshToken);
      return res$.ok(res, null, 'Sesión cerrada correctamente');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** POST /auth/logout-all */
  async logoutAll(req, res) {
    try {
      await User.revokeAllRefreshTokens(req.user.id_usuario);
      return res$.ok(res, null, 'Todas las sesiones cerradas');
    } catch (err) {
      return res$.error(res);
    }
  },
};

module.exports = authController;