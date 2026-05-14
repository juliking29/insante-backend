// ============================================================
//  src/routes/mensajes.routes.js
// ============================================================
'use strict';

const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/mensajesController');
const { authenticate } = require('../middlewares/auth.middleware');
const upload           = require('../middlewares/upload.middleware');

router.use(authenticate);

/**
 * @route  GET /api/v1/mensajes/inbox
 * @desc   Bandeja de entrada
 */
router.get('/inbox', ctrl.inbox);

/**
 * @route  GET /api/v1/mensajes/enviados
 * @desc   Mensajes enviados
 */
router.get('/enviados', ctrl.sent);

/**
 * @route  GET /api/v1/mensajes/guardados
 * @desc   Mensajes guardados / destacados
 */
router.get('/guardados', ctrl.saved);

/**
 * @route  GET /api/v1/mensajes/no-leidos
 * @desc   Contador de mensajes no leídos
 */
router.get('/no-leidos', ctrl.unreadCount);

/**
 * @route  POST /api/v1/mensajes
 * @desc   Enviar nuevo mensaje
 */
router.post('/',
  upload.single('archivo_adjunto'),
  [
    body('asunto').trim().notEmpty().withMessage('Asunto requerido'),
    body('contenido').trim().notEmpty().withMessage('Contenido requerido'),
    body('id_destinatario').isInt({ min: 1 }).withMessage('Destinatario inválido'),
  ],
  ctrl.create
);

/**
 * @route  GET /api/v1/mensajes/:id
 * @desc   Leer mensaje (marca como leído si eres destinatario)
 */
router.get('/:id', ctrl.getOne);

/**
 * @route  PATCH /api/v1/mensajes/:id/guardar
 * @desc   Marcar / desmarcar mensaje como guardado
 */
router.patch('/:id/guardar',
  [body('guardado').isBoolean().withMessage('guardado debe ser boolean')],
  ctrl.toggleSave
);

/**
 * @route  DELETE /api/v1/mensajes/:id
 * @desc   Eliminar mensaje (soft delete por rol)
 */
router.delete('/:id', ctrl.remove);

module.exports = router;