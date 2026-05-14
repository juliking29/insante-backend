// ============================================================
//  src/controllers/mensajesController.js
//  Mensajería interna entre usuarios
// ============================================================

'use strict';

const Mensaje = require('../models/Mensaje');
const User    = require('../models/User');
const res$    = require('../views/response');
const { sendPushNotification } = require('../config/firebase');
const { validationResult }     = require('express-validator');

const mensajesController = {

  /** GET /mensajes/inbox */
  async inbox(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { rows, total } = await Mensaje.inbox({
        id_usuario: req.user.id_usuario, page: +page, limit: +limit,
      });
      return res$.paginated(res, { data: rows, total, page, limit });
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /mensajes/enviados */
  async sent(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const { rows, total } = await Mensaje.sent({
        id_usuario: req.user.id_usuario, page: +page, limit: +limit,
      });
      return res$.paginated(res, { data: rows, total, page, limit });
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /mensajes/guardados */
  async saved(req, res) {
    try {
      const { rows } = await Mensaje.saved({ id_usuario: req.user.id_usuario });
      return res$.ok(res, rows);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /mensajes/no-leidos */
  async unreadCount(req, res) {
    try {
      const total = await Mensaje.countUnread(req.user.id_usuario);
      return res$.ok(res, { total });
    } catch (err) {
      return res$.error(res);
    }
  },

  /** GET /mensajes/:id */
  async getOne(req, res) {
    try {
      const mensaje = await Mensaje.findById(+req.params.id);
      if (!mensaje) return res$.notFound(res, 'Mensaje no encontrado');

      // Verificar que el usuario es remitente o destinatario
      const { id_usuario } = req.user;
      if (mensaje.id_remitente !== id_usuario && mensaje.id_destinatario !== id_usuario) {
        return res$.forbidden(res);
      }

      // Marcar como leído si es el destinatario
      if (mensaje.id_destinatario === id_usuario && !mensaje.leido) {
        await Mensaje.markRead(mensaje.id_mensaje, id_usuario);
      }

      return res$.ok(res, mensaje);
    } catch (err) {
      return res$.error(res);
    }
  },

  /** POST /mensajes */
  async create(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res$.badRequest(res, 'Datos inválidos', errors.array());

    try {
      const { asunto, contenido, id_destinatario } = req.body;
      const id_remitente = req.user.id_usuario;
      const archivo_adjunto = req.file ? req.file.filename : null;

      if (id_remitente === +id_destinatario) {
        return res$.badRequest(res, 'No puedes enviarte mensajes a ti mismo');
      }

      const dest = await User.findById(+id_destinatario);
      if (!dest) return res$.notFound(res, 'Destinatario no encontrado');

      const id_mensaje = await Mensaje.create({
        asunto, contenido, id_remitente, id_destinatario: +id_destinatario, archivo_adjunto,
      });

      // Push al destinatario
      if (dest.fcm_token) {
        const remitente = await User.findById(id_remitente);
        sendPushNotification({
          token: dest.fcm_token,
          title: `✉️ Nuevo mensaje de ${remitente.nombre}`,
          body:  asunto,
          data:  { tipo: 'mensaje', id: String(id_mensaje) },
        });
      }

      return res$.created(res, { id_mensaje }, 'Mensaje enviado');
    } catch (err) {
      console.error('create mensaje:', err);
      return res$.error(res);
    }
  },

  /** PATCH /mensajes/:id/guardar */
  async toggleSave(req, res) {
    try {
      const { guardado } = req.body;
      await Mensaje.toggleSaved(+req.params.id, req.user.id_usuario, guardado);
      return res$.ok(res, null, guardado ? 'Mensaje guardado' : 'Mensaje retirado de guardados');
    } catch (err) {
      return res$.error(res);
    }
  },

  /** DELETE /mensajes/:id */
  async remove(req, res) {
    try {
      const mensaje = await Mensaje.findById(+req.params.id);
      if (!mensaje) return res$.notFound(res, 'Mensaje no encontrado');

      const { id_usuario } = req.user;
      const campo = mensaje.id_remitente === id_usuario
        ? 'eliminado_remitente'
        : 'eliminado_destinatario';

      await Mensaje.deleteForUser(+req.params.id, id_usuario, campo);
      return res$.ok(res, null, 'Mensaje eliminado');
    } catch (err) {
      return res$.error(res);
    }
  },
};

module.exports = mensajesController;