// ============================================================
//  src/controllers/tareasController.js
//  CRUD de tareas académicas
// ============================================================

'use strict';

const Tarea   = require('../models/Tarea');
const Curso   = require('../models/Curso');
const res$    = require('../views/response');
const { sendMulticastPush } = require('../config/firebase');
const { validationResult }  = require('express-validator');

const tareasController = {

  /** GET /tareas */
  async list(req, res) {
    try {
      const { rol, id_usuario } = req.user;
      const { prioridad, materia, page = 1, limit = 20 } = req.query;

      if (rol === 'docente') {
        // El docente lista las tareas de sus cursos
        const id_cursos = await Curso.getIdsByDocente(id_usuario);
        if (id_cursos.length === 0) return res$.ok(res, []);

        // Lista por cada curso — simplificamos devolviendo el primero o con filtro de curso
        const id_curso = req.query.id_curso ? +req.query.id_curso : id_cursos[0];
        const { rows, total } = await Tarea.listByCurso({ id_curso, prioridad, materia, page: +page, limit: +limit });
        return res$.paginated(res, { data: rows, total, page, limit });

      } else {
        let id_cursos = [];
        if (rol === 'estudiante') id_cursos = await Curso.getIdsByEstudiante(id_usuario);
        if (rol === 'acudiente')  id_cursos = await Curso.getIdsByAcudiente(id_usuario);

        const { rows, total } = await Tarea.listForStudent({ id_cursos, page: +page, limit: +limit });
        return res$.paginated(res, { data: rows, total, page, limit });
      }
    } catch (err) {
      console.error('tareas list:', err);
      return res$.error(res);
    }
  },

  /** GET /tareas/:id */
  async getOne(req, res) {
    try {
      const tarea = await Tarea.findById(+req.params.id);
      if (!tarea) return res$.notFound(res, 'Tarea no encontrada');
      return res$.ok(res, tarea);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** POST /tareas */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const { titulo, descripcion, materia, fecha_entrega, prioridad,
               puntaje_max, id_curso, etiquetas } = req.body;
      const id_docente = req.user.id_usuario;
      const archivo_adjunto = req.file ? req.file.filename : null;

      // Verificar que el docente pertenece al curso
      const cursosDocente = await Curso.getIdsByDocente(id_docente);
      if (req.user.rol === 'docente' && !cursosDocente.includes(+id_curso)) {
        return res$.forbidden(res, 'No tienes asignado ese curso');
      }

      const id_tarea = await Tarea.create({
        titulo, descripcion, materia, fecha_entrega, prioridad, puntaje_max,
        id_curso, id_docente, archivo_adjunto,
      });

      if (etiquetas && Array.isArray(etiquetas)) {
        for (const id_etiqueta of etiquetas) {
          await Tarea.addEtiqueta(id_tarea, id_etiqueta);
        }
      }

      // Guardar notificación en BD: estudiantes + acudientes del curso
      const db = require('../config/db');
      const [notifUsers] = await db.query(
        `SELECT DISTINCT u.id_usuario
         FROM estudiantes_cursos ec
         JOIN usuarios u ON u.id_usuario = ec.id_estudiante AND u.activo=1
         WHERE ec.id_curso=? AND ec.activo=1
         UNION
         SELECT DISTINCT ae.id_acudiente
         FROM estudiantes_cursos ec
         JOIN acudiente_estudiante ae ON ae.id_estudiante=ec.id_estudiante AND ae.activo=1
         WHERE ec.id_curso=? AND ec.activo=1`,
        [id_curso, id_curso]
      );
      const Lectura = require('../models/Lectura');
      for (const u of notifUsers) {
        await Lectura.saveNotification({
          id_usuario: u.id_usuario,
          tipo: 'tarea',
          titulo: `📚 Nueva tarea: ${titulo}`,
          cuerpo: `${materia} — Entrega: ${fecha_entrega}`,
          referencia_id: id_tarea,
        });
      }

      // Push a acudientes
      const tokens = await Tarea.getRecipientsTokens(id_tarea);
      if (tokens.length > 0) {
        sendMulticastPush({
          tokens,
          title: `📚 Nueva tarea: ${titulo}`,
          body:  `${materia} — Entrega: ${fecha_entrega}`,
          data:  { tipo: 'tarea', id: String(id_tarea) },
        });
      }

      return res$.created(res, { id_tarea }, 'Tarea creada correctamente');
    } catch (err) {
      console.error('create tarea:', err);
      return res$.error(res);
    }
  },

  /** PUT /tareas/:id */
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const tarea = await Tarea.findById(+req.params.id);
      if (!tarea) return res$.notFound(res, 'Tarea no encontrada');

      if (req.user.rol !== 'administrador' && tarea.id_docente !== req.user.id_usuario) {
        return res$.forbidden(res);
      }

      await Tarea.update(+req.params.id, req.body);
      return res$.ok(res, null, 'Tarea actualizada');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** DELETE /tareas/:id */
  async remove(req, res) {
    try {
      const tarea = await Tarea.findById(+req.params.id);
      if (!tarea) return res$.notFound(res, 'Tarea no encontrada');

      if (req.user.rol !== 'administrador' && tarea.id_docente !== req.user.id_usuario) {
        return res$.forbidden(res);
      }

      await Tarea.delete(+req.params.id);
      return res$.ok(res, null, 'Tarea eliminada');
    } catch (err) {
      return res$.error(res);
    }
  },
};

module.exports = tareasController;