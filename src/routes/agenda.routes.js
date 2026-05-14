// ============================================================
//  src/routes/agenda.routes.js
//  Vista unificada de agenda para el acudiente
// ============================================================
'use strict';

const router  = require('express').Router();
const Lectura = require('../models/Lectura');
const res$    = require('../views/response');
const { authenticate } = require('../middlewares/auth.middleware');
const { allow }        = require('../middlewares/role.middleware');

router.use(authenticate);

/**
 * @route  GET /api/v1/agenda
 * @desc   Agenda unificada del acudiente (avisos + tareas + actividades de sus hijos)
 *         Ordenada por prioridad y fecha límite
 */
router.get('/', allow('acudiente'), async (req, res) => {
  try {
    const rows = await Lectura.getAgendaAcudiente(req.user.id_usuario);
    return res$.ok(res, rows);
  } catch (err) {
    console.error('agenda:', err);
    return res$.error(res);
  }
});

/**
 * @route  GET /api/v1/agenda/pendientes
 * @desc   Solo ítems pendientes sin completar
 */
router.get('/pendientes', async (req, res) => {
  try {
    const rows = await Lectura.getPendientes(req.user.id_usuario);
    return res$.ok(res, rows);
  } catch (err) {
    return res$.error(res);
  }
});

/**
 * @route  PATCH /api/v1/agenda/pendientes/:id/completar
 * @desc   Marcar ítem de agenda como completado
 */
router.patch('/pendientes/:id/completar', async (req, res) => {
  try {
    await Lectura.completePendiente(+req.params.id, req.user.id_usuario);
    return res$.ok(res, null, 'Marcado como completado');
  } catch (err) {
    return res$.error(res);
  }
});

module.exports = router;
