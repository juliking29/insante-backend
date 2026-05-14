// ============================================================
//  src/models/Actividad.js
//  Modelo de actividades: evaluaciones, eventos, excursiones…
// ============================================================

'use strict';

const db = require('../config/db');

const Actividad = {

  async create({ titulo, descripcion, tipo, fecha, hora_inicio, hora_fin,
                  lugar, id_curso, id_creador, es_global }) {
    const [result] = await db.query(
      `INSERT INTO actividades
         (titulo, descripcion, tipo, fecha, hora_inicio, hora_fin,
          lugar, id_curso, id_creador, es_global)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [titulo, descripcion || null, tipo, fecha,
       hora_inicio || null, hora_fin || null, lugar || null,
       id_curso || null, id_creador, es_global ? 1 : 0]
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await db.query(
      `SELECT ac.*, u.nombre AS creador_nombre, c.nombre AS curso
       FROM actividades ac
       LEFT JOIN usuarios u ON u.id_usuario = ac.id_creador
       LEFT JOIN cursos c   ON c.id_curso = ac.id_curso
       WHERE ac.id_actividad = ? AND ac.activo = 1 LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async listForCursos({ id_cursos = [], tipo, fechaDesde, fechaHasta, page = 1, limit = 30 }) {
    const offset = (page - 1) * limit;
    const params = [];

    let courseFilter = '1=0';
    if (id_cursos.length > 0) {
      courseFilter = `ac.id_curso IN (${id_cursos.map(() => '?').join(',')})`;
      params.push(...id_cursos);
    }

    let where = `WHERE ac.activo = 1 AND (ac.es_global = 1 OR ${courseFilter})`;
    if (tipo)       { where += ' AND ac.tipo = ?';                params.push(tipo); }
    if (fechaDesde) { where += ' AND ac.fecha >= ?';              params.push(fechaDesde); }
    if (fechaHasta) { where += ' AND ac.fecha <= ?';              params.push(fechaHasta); }

    const [rows] = await db.query(
      `SELECT ac.id_actividad, ac.titulo, ac.tipo, ac.fecha, ac.hora_inicio,
              ac.hora_fin, ac.lugar, ac.es_global,
              u.nombre AS creador_nombre, c.nombre AS curso
       FROM actividades ac
       LEFT JOIN usuarios u ON u.id_usuario = ac.id_creador
       LEFT JOIN cursos c   ON c.id_curso = ac.id_curso
       ${where}
       ORDER BY ac.fecha ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM actividades ac ${where}`, params
    );

    return { rows, total };
  },

  async update(id, { titulo, descripcion, tipo, fecha, hora_inicio, hora_fin, lugar, es_global }) {
    await db.query(
      `UPDATE actividades SET titulo=?,descripcion=?,tipo=?,fecha=?,
       hora_inicio=?,hora_fin=?,lugar=?,es_global=?
       WHERE id_actividad=?`,
      [titulo, descripcion || null, tipo, fecha,
       hora_inicio || null, hora_fin || null, lugar || null,
       es_global ? 1 : 0, id]
    );
  },

  async delete(id) {
    await db.query('UPDATE actividades SET activo=0 WHERE id_actividad=?', [id]);
  },
};

module.exports = Actividad;