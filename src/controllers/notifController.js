// ============================================================
//  src/controllers/notifController.js
//  Controlador de notificaciones y recordatorios
//  CORREGIDO: archivo estaba vacío
// ============================================================

'use strict';

const db     = require('../config/db');
const Lectura = require('../models/Lectura');
const res$   = require('../views/response');
const { validationResult } = require('express-validator');

const notifController = {

  /** GET /notificaciones — Historial paginado */
  async list(req, res) {
    try {
      const { page = 1, limit = 30 } = req.query;
      const data = await Lectura.listByUser({
        id_usuario: req.user.id_usuario,
        page: +page,
        limit: +limit,
      });
      return res$.ok(res, data);
    } catch (err) {
      console.error('notif list:', err);
      return res$.error(res);
    }
  },

  /** PATCH /notificaciones/:id/leer */
  async markOne(req, res) {
    try {
      await Lectura.markRead(+req.params.id, req.user.id_usuario);
      return res$.ok(res, null, 'Notificación marcada como leída');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** PATCH /notificaciones/leer-todas */
  async markAll(req, res) {
    try {
      await Lectura.markAllRead(req.user.id_usuario);
      return res$.ok(res, null, 'Todas las notificaciones marcadas como leídas');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /notificaciones/config */
  async getConfig(req, res) {
    try {
      const config = await Lectura.getConfig(req.user.id_usuario);
      return res$.ok(res, config);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** PUT /notificaciones/config */
  async updateConfig(req, res) {
    try {
      await Lectura.updateConfig(req.user.id_usuario, req.body);
      return res$.ok(res, null, 'Configuración actualizada');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /notificaciones/pendientes */
  async getPendientes(req, res) {
    try {
      const rows = await Lectura.getPendientes(req.user.id_usuario);
      return res$.ok(res, rows);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** PATCH /notificaciones/pendientes/:id/completar */
  async completarPendiente(req, res) {
    try {
      await Lectura.completePendiente(+req.params.id, req.user.id_usuario);
      return res$.ok(res, null, 'Pendiente completado');
    } catch (err) {
      return res$.error(res);
    }
  },

  // ── Recordatorios ──────────────────────────────────────────

  /** GET /notificaciones/recordatorios */
  async listRecordatorios(req, res) {
    try {
      const [rows] = await db.query(
        `SELECT r.id_recordatorio, r.titulo, r.mensaje, r.fecha_hora,
                r.enviado, r.enviado_en, r.activo,
                r.id_tarea, r.id_actividad, r.created_at
         FROM recordatorios r
         WHERE r.id_usuario=? AND r.activo=1
         ORDER BY r.fecha_hora ASC`,
        [req.user.id_usuario]
      );
      return res$.ok(res, rows);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** POST /notificaciones/recordatorios */
  async createRecordatorio(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const { titulo, mensaje, fecha_hora, id_tarea, id_actividad } = req.body;
      const [result] = await db.query(
        `INSERT INTO recordatorios (id_usuario, titulo, mensaje, fecha_hora, id_tarea, id_actividad)
         VALUES (?,?,?,?,?,?)`,
        [req.user.id_usuario, titulo, mensaje || null, fecha_hora,
         id_tarea || null, id_actividad || null]
      );
      return res$.created(res, { id_recordatorio: result.insertId }, 'Recordatorio creado');
    } catch (err) {
      console.error('create recordatorio:', err);
      return res$.error(res);
    }
  },

  /** DELETE /notificaciones/recordatorios/:id */
  async deleteRecordatorio(req, res) {
    try {
      await db.query(
        'UPDATE recordatorios SET activo=0 WHERE id_recordatorio=? AND id_usuario=?',
        [+req.params.id, req.user.id_usuario]
      );
      return res$.ok(res, null, 'Recordatorio eliminado');
    } catch (err) {
      return res$.error(res);
    }
  },
};

module.exports = notifController;