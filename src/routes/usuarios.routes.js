// ============================================================
//  src/routes/usuarios.routes.js
// ============================================================
'use strict';

const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/usuariosController');
const { authenticate }    = require('../middlewares/auth.middleware');
const { allow, selfOrAdmin } = require('../middlewares/role.middleware');
const upload  = require('../middlewares/upload.middleware');

// Todas las rutas requieren autenticación
router.use(authenticate);

/**
 * @route  GET /api/v1/usuarios
 * @desc   Listar usuarios (paginado) — solo admin
 */
router.get('/', ctrl.list);

/**
 * @route  GET /api/v1/usuarios/me
 * @desc   Perfil del usuario autenticado
 */
router.get('/me', ctrl.me);

/**
 * @route  PUT /api/v1/usuarios/me
 * @desc   Actualizar perfil propio
 */
router.put('/me',
  upload.single('foto_perfil'),
  [
    body('nombre').optional().trim().notEmpty(),
    body('apellido').optional().trim().notEmpty(),
    body('telefono').optional().trim(),
  ],
  ctrl.updateMe
);

/**
 * @route  PUT /api/v1/usuarios/me/password
 * @desc   Cambiar contraseña propia
 */
router.put('/me/password',
  [
    body('password_actual').notEmpty().withMessage('Contraseña actual requerida'),
    body('password_nueva').isLength({ min: 6 }).withMessage('Mínimo 6 caracteres'),
  ],
  ctrl.changePassword
);

/**
 * @route  PATCH /api/v1/usuarios/me/fcm
 * @desc   Actualizar FCM token para push notifications
 */
router.patch('/me/fcm', ctrl.updateFcm);

/**
 * @route  POST /api/v1/usuarios/vincular-acudiente
 * @desc   Vincular acudiente con estudiante — solo admin
 */
router.post('/vincular-acudiente',
  allow('administrador'),
  [
    body('id_acudiente').isInt({ min: 1 }).withMessage('ID acudiente inválido'),
    body('id_estudiante').isInt({ min: 1 }).withMessage('ID estudiante inválido'),
  ],
  ctrl.vincularAcudiente
);

/**
 * @route  GET /api/v1/usuarios/:id
 * @desc   Obtener usuario por ID — propio o admin
 */
router.get('/:id', selfOrAdmin, ctrl.getOne);

/**
 * @route  PATCH /api/v1/usuarios/:id/estado
 * @desc   Activar / desactivar usuario — solo admin
 */
router.patch('/:id/estado',
  allow('administrador'),
  [body('activo').isBoolean().withMessage('activo debe ser boolean')],
  ctrl.setActive
);

module.exports = router;