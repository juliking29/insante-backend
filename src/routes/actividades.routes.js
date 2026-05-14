// ============================================================
//  src/routes/actividades.routes.js
// ============================================================
'use strict';

const router  = require('express').Router();
const { body } = require('express-validator');
const ctrl    = require('../controllers/actividadesController');
const { authenticate } = require('../middlewares/auth.middleware');
const { allow }        = require('../middlewares/role.middleware');

router.use(authenticate);

/**
 * @route  GET /api/v1/actividades
 * @desc   Listar actividades del usuario
 * @query  tipo, fechaDesde, fechaHasta, page, limit
 */
router.get('/', ctrl.list);

/**
 * @route  POST /api/v1/actividades
 * @desc   Crear actividad — docente o admin
 */
router.post('/',
  allow('docente', 'administrador'),
  [
    body('titulo').trim().notEmpty().withMessage('Título requerido'),
    body('tipo').isIn(['evaluacion','examen','evento','excursion','izacion','reunion_padres','otro'])
      .withMessage('Tipo de actividad inválido'),
    body('fecha').isDate().withMessage('Fecha inválida'),
    body('hora_inicio').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body('hora_fin').optional().matches(/^\d{2}:\d{2}(:\d{2})?$/),
    body('id_curso').optional().isInt({ min: 1 }),
    body('es_global').optional().isBoolean(),
  ],
  ctrl.create
);

/**
 * @route  GET /api/v1/actividades/:id
 * @desc   Obtener actividad por ID
 */
router.get('/:id', ctrl.getOne);

/**
 * @route  PUT /api/v1/actividades/:id
 * @desc   Actualizar actividad — creador o admin
 */
router.put('/:id',
  allow('docente', 'administrador'),
  [
    body('titulo').optional().trim().notEmpty(),
    body('tipo').optional().isIn(['evaluacion','examen','evento','excursion','izacion','reunion_padres','otro']),
    body('fecha').optional().isDate(),
  ],
  ctrl.update
);

/**
 * @route  DELETE /api/v1/actividades/:id
 * @desc   Eliminar actividad (soft delete)
 */
router.delete('/:id', allow('docente', 'administrador'), ctrl.remove);

module.exports = router;