// ============================================================
//  src/routes/cursos.routes.js
// ============================================================
'use strict';

const router  = require('express').Router();
const { body } = require('express-validator');
const Curso   = require('../models/Curso');
const res$    = require('../views/response');
const { authenticate }  = require('../middlewares/auth.middleware');
const { allow }         = require('../middlewares/role.middleware');

router.use(authenticate);

/**
 * @route  GET /api/v1/cursos
 * @desc   Listar cursos activos
 */
router.get('/', async (req, res) => {
  try {
    const { nivel, anio_escolar, page = 1, limit = 50 } = req.query;
    const { rows, total } = await Curso.list({ nivel, anio_escolar, page: +page, limit: +limit });
    // FIX: pasar data:rows explícitamente igual que avisos
    return res$.paginated(res, { data: rows, total, page, limit });
  } catch (err) {
    return res$.error(res);
  }
});

/**
 * @route  POST /api/v1/cursos
 * @desc   Crear curso — solo admin
 */
router.post('/',
  allow('administrador'),
  [
    body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
    body('grado').trim().notEmpty().withMessage('Grado requerido'),
    body('seccion').trim().notEmpty().withMessage('Sección requerida'),
    body('nivel').isIn(['preescolar','primaria','secundaria']).withMessage('Nivel inválido'),
    body('anio_escolar').isInt({ min: 2020, max: 2100 }).withMessage('Año escolar inválido'),
    body('id_director').optional().isInt({ min: 1 }),
  ],
  async (req, res) => {
    try {
      const id_curso = await Curso.create(req.body);
      return res$.created(res, { id_curso }, 'Curso creado');
    } catch (err) {
      return res$.error(res);
    }
  }
);

/**
 * @route  GET /api/v1/cursos/:id
 * @desc   Obtener curso por ID
 */
router.get('/:id', async (req, res) => {
  try {
    const curso = await Curso.findById(+req.params.id);
    if (!curso) return res$.notFound(res, 'Curso no encontrado');
    return res$.ok(res, curso);
  } catch (err) {
    return res$.error(res);
  }
});

/**
 * @route  GET /api/v1/cursos/:id/estudiantes
 * @desc   Listar estudiantes de un curso — docente o admin
 */
router.get('/:id/estudiantes',
  allow('docente', 'administrador'),
  async (req, res) => {
    try {
      const estudiantes = await Curso.getStudents(+req.params.id);
      return res$.ok(res, estudiantes);
    } catch (err) {
      return res$.error(res);
    }
  }
);

/**
 * @route  POST /api/v1/cursos/:id/matricular
 * @desc   Matricular estudiante en curso — solo admin
 */
router.post('/:id/matricular',
  allow('administrador'),
  [
    body('id_estudiante').isInt({ min: 1 }).withMessage('ID estudiante inválido'),
    body('periodo').trim().notEmpty().withMessage('Período requerido'),
  ],
  async (req, res) => {
    try {
      const { id_estudiante, periodo, fecha_matricula } = req.body;
      await Curso.matricularEstudiante({
        id_estudiante,
        id_curso: +req.params.id,
        periodo,
        fecha_matricula: fecha_matricula || null,
      });
      return res$.ok(res, null, 'Estudiante matriculado');
    } catch (err) {
      return res$.error(res);
    }
  }
);

/**
 * @route  POST /api/v1/cursos/:id/asignar-docente
 * @desc   Asignar docente a curso — solo admin
 */
router.post('/:id/asignar-docente',
  allow('administrador'),
  [
    body('id_docente').isInt({ min: 1 }).withMessage('ID docente inválido'),
    body('materia').trim().notEmpty().withMessage('Materia requerida'),
    body('periodo').trim().notEmpty().withMessage('Período requerido'),
  ],
  async (req, res) => {
    try {
      const { id_docente, materia, periodo } = req.body;
      await Curso.asignarDocente({
        id_docente,
        id_curso: +req.params.id,
        materia,
        periodo,
      });
      return res$.ok(res, null, 'Docente asignado al curso');
    } catch (err) {
      return res$.error(res);
    }
  }
);

/**
 * @route  GET /api/v1/cursos/:id/docentes
 * @desc   Listar docentes de un curso con su materia
 */
router.get('/:id/docentes', async (req, res) => {
  try {
    const db = require('../config/db');
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.foto_perfil,
              u.email, dc.materia, dc.periodo
       FROM docentes_cursos dc
       JOIN usuarios u ON u.id_usuario = dc.id_docente
       WHERE dc.id_curso = ? AND dc.activo = 1
       ORDER BY dc.materia`,
      [+req.params.id]
    );
    return res$.ok(res, rows);
  } catch (err) {
    console.error('docentes by curso:', err);
    return res$.error(res);
  }
});

module.exports = router;