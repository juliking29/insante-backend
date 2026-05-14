// ============================================================
//  src/routes/notificaciones.routes.js
//  CORREGIDO: usa notifController en lugar de inline
// ============================================================
'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/notifController');
const { authenticate } = require('../middlewares/auth.middleware');

router.use(authenticate);

/**
 * @route  GET /api/v1/notificaciones
 * @desc   Historial de notificaciones del usuario autenticado
 */
router.get('/', ctrl.list);

/**
 * @route  PATCH /api/v1/notificaciones/leer-todas
 * @desc   Marcar todas las notificaciones como leídas
 * IMPORTANTE: debe ir ANTES de /:id para no confundir la ruta
 */
router.patch('/leer-todas', ctrl.markAll);

/**
 * @route  GET /api/v1/notificaciones/config
 * @desc   Obtener configuración de notificaciones push
 */
router.get('/config', ctrl.getConfig);

/**
 * @route  PUT /api/v1/notificaciones/config
 * @desc   Actualizar preferencias de notificaciones push
 */
router.put('/config', ctrl.updateConfig);

/**
 * @route  GET /api/v1/notificaciones/pendientes
 * @desc   Pendientes activos del usuario
 */
router.get('/pendientes', ctrl.getPendientes);

/**
 * @route  PATCH /api/v1/notificaciones/pendientes/:id/completar
 * @desc   Marcar pendiente como completado
 */
router.patch('/pendientes/:id/completar', ctrl.completarPendiente);

/**
 * @route  GET /api/v1/notificaciones/recordatorios
 * @desc   Listar recordatorios del usuario
 */
router.get('/recordatorios', ctrl.listRecordatorios);

/**
 * @route  POST /api/v1/notificaciones/recordatorios
 * @desc   Crear recordatorio
 */
router.post('/recordatorios',
  [
    body('titulo').trim().notEmpty().withMessage('Título requerido'),
    body('fecha_hora').isISO8601().withMessage('Fecha y hora inválida'),
    body('id_tarea').optional().isInt({ min: 1 }),
    body('id_actividad').optional().isInt({ min: 1 }),
  ],
  ctrl.createRecordatorio
);

/**
 * @route  DELETE /api/v1/notificaciones/recordatorios/:id
 * @desc   Eliminar recordatorio (soft delete)
 */
router.delete('/recordatorios/:id', ctrl.deleteRecordatorio);

/**
 * @route  PATCH /api/v1/notificaciones/:id/leer
 * @desc   Marcar una notificación como leída
 */
router.patch('/:id/leer', ctrl.markOne);

module.exports = router;