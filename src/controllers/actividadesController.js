// ============================================================
//  src/controllers/actividadesController.js
//  Gestión de actividades académicas y eventos
// ============================================================

'use strict';

const Actividad = require('../models/Actividad');
const Curso     = require('../models/Curso');
const res$      = require('../views/response');
const { sendMulticastPush } = require('../config/firebase');
const { validationResult }  = require('express-validator');

const actividadesController = {

  /** GET /actividades */
  async list(req, res) {
    try {
      const { rol, id_usuario } = req.user;
      const { tipo, fechaDesde, fechaHasta, page = 1, limit = 30 } = req.query;

      let id_cursos = [];
      if (rol === 'acudiente')  id_cursos = await Curso.getIdsByAcudiente(id_usuario);
      if (rol === 'estudiante') id_cursos = await Curso.getIdsByEstudiante(id_usuario);
      if (rol === 'docente')    id_cursos = await Curso.getIdsByDocente(id_usuario);

      const { rows, total } = await Actividad.listForCursos({
        id_cursos, tipo, fechaDesde, fechaHasta, page: +page, limit: +limit,
      });

      return res$.paginated(res, { data: rows, total, page, limit });
    } catch (err) {
      console.error('actividades list:', err);
      return res$.error(res);
    }
  },

  /** GET /actividades/:id */
  async getOne(req, res) {
    try {
      const actividad = await Actividad.findById(+req.params.id);
      if (!actividad) return res$.notFound(res, 'Actividad no encontrada');
      return res$.ok(res, actividad);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** POST /actividades */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const { titulo, descripcion, tipo, fecha, hora_inicio, hora_fin,
               lugar, id_curso, es_global } = req.body;
      const id_creador = req.user.id_usuario;

      const id_actividad = await Actividad.create({
        titulo, descripcion, tipo, fecha, hora_inicio, hora_fin,
        lugar, id_curso: id_curso || null, id_creador,
        es_global: es_global || false,
      });

      // Push notification
      const db = require('../config/db');
      let tokens = [];

      if (es_global) {
        // Todos los acudientes activos
        const User = require('../models/User');
        tokens = await User.getFcmTokensByRole('acudiente');
      } else if (id_curso) {
        const Tarea = require('../models/Tarea');
        // Reutilizamos la lógica de obtener tokens por curso
        const [rows] = await db.query(
          `SELECT DISTINCT u.fcm_token
           FROM estudiantes_cursos ec
           JOIN acudiente_estudiante ae ON ae.id_estudiante = ec.id_estudiante
           JOIN usuarios u ON u.id_usuario = ae.id_acudiente AND u.activo=1
           WHERE ec.id_curso=? AND ec.activo=1 AND u.fcm_token IS NOT NULL`,
          [id_curso]
        );
        tokens = rows.map(r => r.fcm_token);
      }

      if (tokens.length > 0) {
        sendMulticastPush({
          tokens,
          title: `📅 ${titulo}`,
          body:  `Tipo: ${tipo} — Fecha: ${fecha}${hora_inicio ? ' ' + hora_inicio : ''}`,
          data:  { tipo: 'actividad', id: String(id_actividad) },
        });
      }

      return res$.created(res, { id_actividad }, 'Actividad creada');
    } catch (err) {
      console.error('create actividad:', err);
      return res$.error(res);
    }
  },

  /** PUT /actividades/:id */
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const actividad = await Actividad.findById(+req.params.id);
      if (!actividad) return res$.notFound(res, 'Actividad no encontrada');

      if (req.user.rol !== 'administrador' && actividad.id_creador !== req.user.id_usuario) {
        return res$.forbidden(res);
      }

      await Actividad.update(+req.params.id, req.body);
      return res$.ok(res, null, 'Actividad actualizada');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** DELETE /actividades/:id */
  async remove(req, res) {
    try {
      const actividad = await Actividad.findById(+req.params.id);
      if (!actividad) return res$.notFound(res, 'Actividad no encontrada');

      if (req.user.rol !== 'administrador' && actividad.id_creador !== req.user.id_usuario) {
        return res$.forbidden(res);
      }

      await Actividad.delete(+req.params.id);
      return res$.ok(res, null, 'Actividad eliminada');
    } catch (err) {
      return res$.error(res);
    }
  },
};

module.exports = actividadesController;