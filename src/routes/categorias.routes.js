// ============================================================
//  src/routes/categorias.routes.js
// ============================================================
'use strict';

const router = require('express').Router();
const db     = require('../config/db');
const res$   = require('../views/response');
const { authenticate } = require('../middlewares/auth.middleware');
const { allow }        = require('../middlewares/role.middleware');

router.use(authenticate);

/**
 * @route  GET /api/v1/categorias
 * @desc   Listar categorías de avisos
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM categorias_aviso WHERE activo=1 ORDER BY nombre'
    );
    return res$.ok(res, rows);
  } catch (err) {
    return res$.error(res);
  }
});

/**
 * @route  POST /api/v1/categorias
 * @desc   Crear categoría — solo admin
 */
router.post('/',
  allow('administrador'),
  async (req, res) => {
    try {
      const { nombre, icono, color_hex } = req.body;
      if (!nombre) return res$.badRequest(res, 'Nombre requerido');
      const [result] = await db.query(
        'INSERT INTO categorias_aviso (nombre, icono, color_hex) VALUES (?,?,?)',
        [nombre, icono || null, color_hex || '#1A3A6B']
      );
      return res$.created(res, { id_categoria: result.insertId }, 'Categoría creada');
    } catch (err) {
      return res$.error(res);
    }
  }
);

/**
 * @route  GET /api/v1/categorias/etiquetas
 * @desc   Listar etiquetas disponibles
 */
router.get('/etiquetas', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM etiquetas ORDER BY nombre');
    return res$.ok(res, rows);
  } catch (err) {
    return res$.error(res);
  }
});

module.exports = router;
