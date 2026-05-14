// ============================================================
//  src/routes/tareas.routes.js
// ============================================================
'use strict';

const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/tareasController');
const { authenticate } = require('../middlewares/auth.middleware');
const { allow }        = require('../middlewares/role.middleware');
const upload           = require('../middlewares/upload.middleware');

router.use(authenticate);

/**
 * @route  GET /api/v1/tareas
 * @desc   Listar tareas según rol del usuario
 */
router.get('/', ctrl.list);

/**
 * @route  POST /api/v1/tareas
 * @desc   Crear tarea — docente o admin
 */
router.post('/',
  allow('docente', 'administrador'),
  upload.single('archivo_adjunto'),
  [
    body('titulo').trim().notEmpty().withMessage('Título requerido'),
    body('materia').trim().notEmpty().withMessage('Materia requerida'),
    body('fecha_entrega').isDate().withMessage('Fecha de entrega inválida'),
    body('id_curso').isInt({ min: 1 }).withMessage('Curso requerido'),
    body('prioridad').optional().isIn(['alta', 'media', 'baja']),
    body('puntaje_max').optional().isFloat({ min: 0 }),
    body('etiquetas').optional().isArray(),
  ],
  ctrl.create
);

/**
 * @route  GET /api/v1/tareas/:id
 * @desc   Obtener tarea por ID con etiquetas
 */
router.get('/:id', ctrl.getOne);

/**
 * @route  PUT /api/v1/tareas/:id
 * @desc   Actualizar tarea — docente autor o admin
 */
router.put('/:id',
  allow('docente', 'administrador'),
  upload.single('archivo_adjunto'),
  [
    body('titulo').optional().trim().notEmpty(),
    body('materia').optional().trim().notEmpty(),
    body('fecha_entrega').optional().isDate(),
    body('prioridad').optional().isIn(['alta', 'media', 'baja']),
  ],
  ctrl.update
);

/**
 * @route  DELETE /api/v1/tareas/:id
 * @desc   Eliminar tarea (soft delete)
 */
router.delete('/:id', allow('docente', 'administrador'), ctrl.remove);

module.exports = router;