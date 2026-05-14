// ============================================================
//  src/models/Tarea.js
//  Modelo de tareas académicas
// ============================================================

'use strict';

const db = require('../config/db');

const Tarea = {

  async create({ titulo, descripcion, materia, fecha_entrega, prioridad,
                  puntaje_max, id_curso, id_docente, archivo_adjunto }) {
    const [result] = await db.query(
      `INSERT INTO tareas
         (titulo, descripcion, materia, fecha_entrega, prioridad, puntaje_max,
          id_curso, id_docente, archivo_adjunto)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [titulo, descripcion || null, materia, fecha_entrega,
       prioridad || 'media', puntaje_max || null,
       id_curso, id_docente, archivo_adjunto || null]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT t.*, u.nombre AS docente_nombre, u.apellido AS docente_apellido,
              c.nombre AS curso
       FROM tareas t
       JOIN usuarios u ON u.id_usuario = t.id_docente
       JOIN cursos c   ON c.id_curso = t.id_curso
       WHERE t.id_tarea = ? AND t.activo = 1 LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;

    const [etiquetas] = await db.query(
      `SELECT e.id_etiqueta, e.nombre, e.color_hex
       FROM tareas_etiquetas te
       JOIN etiquetas e ON e.id_etiqueta = te.id_etiqueta
       WHERE te.id_tarea = ?`,
      [id]
    );
    rows[0].etiquetas = etiquetas;
    return rows[0];
  },

  async listByCurso({ id_curso, prioridad, materia, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [id_curso];
    let where = 'WHERE t.id_curso = ? AND t.activo = 1';

    if (prioridad) { where += ' AND t.prioridad = ?'; params.push(prioridad); }
    if (materia)   { where += ' AND t.materia = ?';   params.push(materia); }

    const [rows] = await db.query(
      `SELECT t.id_tarea, t.titulo, t.materia, t.fecha_entrega, t.prioridad,
              t.puntaje_max, t.created_at,
              u.nombre AS docente_nombre, u.apellido AS docente_apellido
       FROM tareas t
       JOIN usuarios u ON u.id_usuario = t.id_docente
       ${where}
       ORDER BY FIELD(t.prioridad,'alta','media','baja'), t.fecha_entrega ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tareas t ${where}`, params
    );

    return { rows, total };
  },

  /** Tareas de los cursos del estudiante/acudiente */
  async listForStudent({ id_cursos = [], page = 1, limit = 20 }) {
    if (id_cursos.length === 0) return { rows: [], total: 0 };
    const offset = (page - 1) * limit;
    const placeholders = id_cursos.map(() => '?').join(',');

    const [rows] = await db.query(
      `SELECT t.id_tarea, t.titulo, t.materia, t.fecha_entrega, t.prioridad,
              t.puntaje_max, c.nombre AS curso,
              u.nombre AS docente_nombre
       FROM tareas t
       JOIN cursos c   ON c.id_curso = t.id_curso
       JOIN usuarios u ON u.id_usuario = t.id_docente
       WHERE t.id_curso IN (${placeholders}) AND t.activo = 1
       ORDER BY FIELD(t.prioridad,'alta','media','baja'), t.fecha_entrega ASC
       LIMIT ? OFFSET ?`,
      [...id_cursos, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM tareas t
       WHERE t.id_curso IN (${placeholders}) AND t.activo = 1`,
      id_cursos
    );

    return { rows, total };
  },

  async update(id, { titulo, descripcion, materia, fecha_entrega, prioridad, puntaje_max, archivo_adjunto }) {
    await db.query(
      `UPDATE tareas SET titulo=?,descripcion=?,materia=?,fecha_entrega=?,
       prioridad=?,puntaje_max=?,archivo_adjunto=?
       WHERE id_tarea=?`,
      [titulo, descripcion || null, materia, fecha_entrega,
       prioridad, puntaje_max || null, archivo_adjunto || null, id]
    );
  },

  async delete(id) {
    await db.query('UPDATE tareas SET activo=0 WHERE id_tarea=?', [id]);
  },

  async addEtiqueta(id_tarea, id_etiqueta) {
    await db.query(
      'INSERT IGNORE INTO tareas_etiquetas (id_tarea, id_etiqueta) VALUES (?,?)',
      [id_tarea, id_etiqueta]
    );
  },

  /** FCM tokens de acudientes del curso para push */
  async getRecipientsTokens(id_tarea) {
    const [rows] = await db.query(
      `SELECT DISTINCT u.fcm_token
       FROM tareas t
       JOIN estudiantes_cursos ec ON ec.id_curso = t.id_curso AND ec.activo = 1
       JOIN acudiente_estudiante ae ON ae.id_estudiante = ec.id_estudiante
       JOIN usuarios u ON u.id_usuario = ae.id_acudiente AND u.activo = 1
       WHERE t.id_tarea = ? AND u.fcm_token IS NOT NULL`,
      [id_tarea]
    );
    return rows.map(r => r.fcm_token);
  },
};

module.exports = Tarea;