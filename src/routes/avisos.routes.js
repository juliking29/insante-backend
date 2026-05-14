// ============================================================
//  src/routes/avisos.routes.js
// ============================================================
'use strict';

const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/avisosController');
const { authenticate }  = require('../middlewares/auth.middleware');
const { allow }         = require('../middlewares/role.middleware');
const upload            = require('../middlewares/upload.middleware');

router.use(authenticate);

/**
 * @route  GET /api/v1/avisos
 * @desc   Listar avisos del usuario (según sus cursos + globales)
 */
router.get('/', ctrl.list);

/**
 * @route  POST /api/v1/avisos
 * @desc   Crear aviso — docente o administrador
 */
router.post('/',
  allow('docente', 'administrador'),
  upload.single('archivo_adjunto'),
  [
    body('titulo').trim().notEmpty().withMessage('Título requerido'),
    body('contenido').trim().notEmpty().withMessage('Contenido requerido'),
    body('prioridad').optional().isIn(['alta', 'media', 'baja']),
    body('id_curso').optional().isInt({ min: 1 }),
    body('es_global').optional().isBoolean(),
    body('requiere_confirmacion').optional().isBoolean(),
    body('fecha_vencimiento').optional().isDate(),
    body('etiquetas').optional().isArray(),
  ],
  ctrl.create
);

/**
 * @route  GET /api/v1/avisos/:id
 * @desc   Obtener aviso y registrar lectura automática
 */
router.get('/:id', ctrl.getOne);

/**
 * @route  PUT /api/v1/avisos/:id
 * @desc   Actualizar aviso — autor o admin
 */
router.put('/:id',
  allow('docente', 'administrador'),
  upload.single('archivo_adjunto'),
  [
    body('titulo').optional().trim().notEmpty(),
    body('contenido').optional().trim().notEmpty(),
    body('prioridad').optional().isIn(['alta', 'media', 'baja']),
  ],
  ctrl.update
);

/**
 * @route  DELETE /api/v1/avisos/:id
 * @desc   Eliminar aviso (soft delete) — autor o admin
 */
router.delete('/:id', allow('docente', 'administrador'), ctrl.remove);

/**
 * @route  POST /api/v1/avisos/:id/confirmar
 * @desc   Acudiente confirma lectura del aviso
 */
router.post('/:id/confirmar', allow('acudiente'), ctrl.confirmar);

/**
 * @route  GET /api/v1/avisos/:id/lecturas
 * @desc   Ver quiénes han leído el aviso — docente/admin
 */
router.get('/:id/lecturas', allow('docente', 'administrador'), ctrl.lecturas);

module.exports = router;