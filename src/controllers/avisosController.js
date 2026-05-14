// ============================================================
//  src/controllers/avisosController.js
//  CRUD de avisos + lectura + confirmación
// ============================================================

'use strict';

const Aviso   = require('../models/Aviso');
const Curso   = require('../models/Curso');
const Lectura = require('../models/Lectura');
const res$    = require('../views/response');
const { sendMulticastPush } = require('../config/firebase');
const { validationResult }  = require('express-validator');

const avisosController = {

  /** GET /avisos  — Lista avisos del usuario autenticado */
  async list(req, res) {
    try {
      const { rol, id_usuario } = req.user;
      const { prioridad, id_categoria, page = 1, limit = 20, search = '' } = req.query;

      let id_cursos = [];
      if (rol === 'acudiente')   id_cursos = await Curso.getIdsByAcudiente(id_usuario);
      if (rol === 'estudiante')  id_cursos = await Curso.getIdsByEstudiante(id_usuario);
      if (rol === 'docente')     id_cursos = await Curso.getIdsByDocente(id_usuario);
      // administrador ve todos → id_cursos vacío pero es_global = 1 igualmente aparecerá

      const { rows, total } = await Aviso.listForUser({
        id_cursos, prioridad, id_categoria,
        page: +page, limit: +limit, search,
      });

      return res$.paginated(res, { data: rows, total, page, limit });
    } catch (err) {
      console.error('avisos list:', err);
      return res$.error(res);
    }
  },

  /** GET /avisos/:id */
  async getOne(req, res) {
    try {
      const aviso = await Aviso.findById(+req.params.id);
      if (!aviso) return res$.notFound(res, 'Aviso no encontrado');

      // Registrar lectura automática
      await Aviso.markRead(aviso.id_aviso, req.user.id_usuario);

      return res$.ok(res, aviso);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** POST /avisos  — Docente/Admin crea aviso */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const { titulo, contenido, prioridad, id_categoria, id_curso, es_global,
               fecha_vencimiento, requiere_confirmacion, etiquetas } = req.body;
      const id_autor = req.user.id_usuario;
      const archivo_adjunto = req.file ? req.file.filename : null;

      const id_aviso = await Aviso.create({
        titulo, contenido, prioridad, id_categoria, id_autor, id_curso,
        es_global, archivo_adjunto, fecha_vencimiento, requiere_confirmacion,
      });

      // Agregar etiquetas si vienen
      if (etiquetas && Array.isArray(etiquetas)) {
        for (const id_etiqueta of etiquetas) {
          await Aviso.addEtiqueta(id_aviso, id_etiqueta);
        }
      }

      // Crear pendiente para usuarios si requiere confirmación
      if (requiere_confirmacion && id_curso) {
        const estudiantes = await Curso.getStudents(id_curso);
        for (const est of estudiantes) {
          await Lectura.addPendiente({
            id_usuario: est.id_usuario, tipo: 'aviso',
            referencia_id: id_aviso, titulo, fecha_limite: fecha_vencimiento || null,
          });
        }
      }

      // Enviar push notifications
      const tokens = await Aviso.getRecipientsTokens(id_aviso);
      if (tokens.length > 0) {
        sendMulticastPush({
          tokens,
          title: `📢 ${prioridad === 'alta' ? '🔴 URGENTE: ' : ''}${titulo}`,
          body:  contenido.substring(0, 100),
          data:  { tipo: 'aviso', id: String(id_aviso) },
        });
      }

      return res$.created(res, { id_aviso }, 'Aviso publicado correctamente');
    } catch (err) {
      console.error('create aviso:', err);
      return res$.error(res);
    }
  },

  /** PUT /avisos/:id */
  async update(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const aviso = await Aviso.findById(+req.params.id);
      if (!aviso) return res$.notFound(res, 'Aviso no encontrado');

      // Solo el autor o admin puede editar
      if (req.user.rol !== 'administrador' && aviso.id_autor !== req.user.id_usuario) {
        return res$.forbidden(res);
      }

      await Aviso.update(+req.params.id, req.body);
      return res$.ok(res, null, 'Aviso actualizado');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** DELETE /avisos/:id */
  async remove(req, res) {
    try {
      const aviso = await Aviso.findById(+req.params.id);
      if (!aviso) return res$.notFound(res, 'Aviso no encontrado');

      if (req.user.rol !== 'administrador' && aviso.id_autor !== req.user.id_usuario) {
        return res$.forbidden(res);
      }

      await Aviso.delete(+req.params.id);
      return res$.ok(res, null, 'Aviso eliminado');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** POST /avisos/:id/confirmar  — Acudiente confirma lectura */
  async confirmar(req, res) {
    try {
      await Aviso.confirmRead(+req.params.id, req.user.id_usuario);
      return res$.ok(res, null, 'Lectura confirmada');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /avisos/:id/lecturas  — Quiénes han leído (docente/admin) */
  async lecturas(req, res) {
    try {
      const data = await Aviso.getReadStatus(+req.params.id);
      return res$.ok(res, data);
    } catch (err) {
      return res$.error(res);
    }
  },
};

module.exports = avisosController;