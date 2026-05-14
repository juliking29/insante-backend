// ============================================================
//  src/models/Curso.js
//  Modelo de cursos y relaciones
// ============================================================

'use strict';

const db = require('../config/db');

const Curso = {

  async create({ nombre, grado, seccion, nivel, anio_escolar, id_director }) {
    const [result] = await db.query(
      `INSERT INTO cursos (nombre, grado, seccion, nivel, anio_escolar, id_director)
       VALUES (?,?,?,?,?,?)`,
      [nombre, grado, seccion, nivel, anio_escolar, id_director || null]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT c.*, u.nombre AS director_nombre, u.apellido AS director_apellido
       FROM cursos c
       LEFT JOIN usuarios u ON u.id_usuario = c.id_director
       WHERE c.id_curso=? LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async list({ nivel, anio_escolar, page = 1, limit = 50 }) {
    const offset = (page - 1) * limit;
    let where = 'WHERE c.activo=1';
    const params = [];
    if (nivel)       { where += ' AND c.nivel=?';         params.push(nivel); }
    if (anio_escolar){ where += ' AND c.anio_escolar=?';  params.push(anio_escolar); }

    const [rows] = await db.query(
      `SELECT c.id_curso, c.nombre, c.grado, c.seccion, c.nivel, c.anio_escolar,
              u.nombre AS director_nombre
       FROM cursos c
       LEFT JOIN usuarios u ON u.id_usuario = c.id_director
       ${where}
       ORDER BY c.nivel, c.grado, c.seccion
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM cursos c ${where}`, params
    );

    return { rows, total };
  },

  /** IDs de cursos a los que pertenece un estudiante */
  async getIdsByEstudiante(id_estudiante) {
    const [rows] = await db.query(
      `SELECT id_curso FROM estudiantes_cursos
       WHERE id_estudiante=? AND activo=1`,
      [id_estudiante]
    );
    return rows.map(r => r.id_curso);
  },

  /** IDs de cursos donde enseña un docente */
  async getIdsByDocente(id_docente) {
    const [rows] = await db.query(
      `SELECT DISTINCT id_curso FROM docentes_cursos
       WHERE id_docente=? AND activo=1`,
      [id_docente]
    );
    return rows.map(r => r.id_curso);
  },

  /** IDs de cursos de los hijos de un acudiente */
  async getIdsByAcudiente(id_acudiente) {
    const [rows] = await db.query(
      `SELECT DISTINCT ec.id_curso
       FROM acudiente_estudiante ae
       JOIN estudiantes_cursos ec ON ec.id_estudiante = ae.id_estudiante AND ec.activo=1
       WHERE ae.id_acudiente=? AND ae.activo=1`,
      [id_acudiente]
    );
    return rows.map(r => r.id_curso);
  },

  async matricularEstudiante({ id_estudiante, id_curso, periodo, fecha_matricula }) {
    await db.query(
      `INSERT INTO estudiantes_cursos (id_estudiante, id_curso, periodo, fecha_matricula)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE activo=1`,
      [id_estudiante, id_curso, periodo, fecha_matricula || null]
    );
  },

  async asignarDocente({ id_docente, id_curso, materia, periodo }) {
    await db.query(
      `INSERT INTO docentes_cursos (id_docente, id_curso, materia, periodo)
       VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE activo=1`,
      [id_docente, id_curso, materia, periodo]
    );
  },

  async getStudents(id_curso) {
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, u.email, ec.periodo
       FROM estudiantes_cursos ec
       JOIN usuarios u ON u.id_usuario = ec.id_estudiante
       WHERE ec.id_curso=? AND ec.activo=1
       ORDER BY u.apellido, u.nombre`,
      [id_curso]
    );
    return rows;
  },
};

module.exports = Curso;