// ============================================================
//  src/routes/auth.routes.js
// ============================================================
'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth.middleware');

// Validaciones reutilizables
const emailVal    = body('email').isEmail().normalizeEmail().withMessage('Email inválido');
const passVal     = body('password').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres');
const passNueva   = body('password_nueva').isLength({ min: 6 }).withMessage('Nueva contraseña mínimo 6 caracteres');
const nombreVal   = body('nombre').trim().notEmpty().withMessage('Nombre requerido');
const apellidoVal = body('apellido').trim().notEmpty().withMessage('Apellido requerido');
const rolVal      = body('rol')
  .isIn(['acudiente', 'estudiante', 'docente', 'administrador'])
  .withMessage('Rol inválido');

/**
 * @route  POST /api/v1/auth/register
 * @desc   Registrar nuevo usuario
 * @access Public (admin puede crear admins)
 */
router.post('/register',
  [emailVal, passVal, nombreVal, apellidoVal, rolVal],
  authController.register
);

/**
 * @route  POST /api/v1/auth/login
 * @desc   Iniciar sesión
 * @access Public
 */
router.post('/login',
  [emailVal, passVal],
  authController.login
);

/**
 * @route  POST /api/v1/auth/refresh
 * @desc   Renovar access token con refresh token
 * @access Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route  POST /api/v1/auth/logout
 * @desc   Cerrar sesión (revocar refresh token)
 * @access Public
 */
router.post('/logout', authController.logout);

/**
 * @route  POST /api/v1/auth/logout-all
 * @desc   Cerrar todas las sesiones activas
 * @access Private
 */
router.post('/logout-all', authenticate, authController.logoutAll);

module.exports = router;