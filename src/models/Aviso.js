// ============================================================
//  src/models/Aviso.js
//  Modelo de avisos — comunicados institucionales
// ============================================================

'use strict';

const db = require('../config/db');

const Aviso = {

  /** Crear aviso */
  async create({ titulo, contenido, prioridad, id_categoria, id_autor, id_curso, es_global,
                  archivo_adjunto, fecha_vencimiento, requiere_confirmacion }) {
    const [result] = await db.query(
      `INSERT INTO avisos
         (titulo, contenido, prioridad, id_categoria, id_autor, id_curso,
          es_global, archivo_adjunto, fecha_vencimiento, requiere_confirmacion)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [titulo, contenido, prioridad || 'media', id_categoria || null, id_autor,
       id_curso || null, es_global ? 1 : 0, archivo_adjunto || null,
       fecha_vencimiento || null, requiere_confirmacion ? 1 : 0]
    );
    return result.insertId;
  },

  /** Listar avisos para un curso específico o globales, con filtros opcionales */
  async listForUser({ id_cursos = [], prioridad, id_categoria, page = 1, limit = 20, search = '' }) {
    const offset = (page - 1) * limit;
    const params = [];

    let courseFilter = '1=0';
    if (id_cursos.length > 0) {
      courseFilter = `a.id_curso IN (${id_cursos.map(() => '?').join(',')})`;
      params.push(...id_cursos);
    }

    let where = `WHERE a.activo = 1 AND (a.es_global = 1 OR ${courseFilter})`;

    if (prioridad) { where += ' AND a.prioridad = ?'; params.push(prioridad); }
    if (id_categoria) { where += ' AND a.id_categoria = ?'; params.push(id_categoria); }
    if (search) {
      where += ' AND (a.titulo LIKE ? OR a.contenido LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const [rows] = await db.query(
      `SELECT a.id_aviso, a.titulo, a.contenido, a.prioridad, a.es_global,
              a.archivo_adjunto, a.fecha_publicacion, a.fecha_vencimiento,
              a.requiere_confirmacion,
              u.nombre AS autor_nombre, u.apellido AS autor_apellido,
              c.nombre AS curso, cat.nombre AS categoria, cat.color_hex AS categoria_color
       FROM avisos a
       LEFT JOIN usuarios u         ON u.id_usuario = a.id_autor
       LEFT JOIN cursos c           ON c.id_curso = a.id_curso
       LEFT JOIN categorias_aviso cat ON cat.id_categoria = a.id_categoria
       ${where}
       ORDER BY
         FIELD(a.prioridad,'alta','media','baja'),
         a.fecha_publicacion DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM avisos a ${where}`,
      params
    );

    return { rows, total };
  },

  /** Obtener aviso por ID con etiquetas */
  async findById(id) {
    const [rows] = await db.query(
      `SELECT a.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido,
              c.nombre AS curso, cat.nombre AS categoria, cat.color_hex AS categoria_color
       FROM avisos a
       LEFT JOIN usuarios u           ON u.id_usuario = a.id_autor
       LEFT JOIN cursos c             ON c.id_curso = a.id_curso
       LEFT JOIN categorias_aviso cat ON cat.id_categoria = a.id_categoria
       WHERE a.id_aviso = ? AND a.activo = 1 LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;

    const [etiquetas] = await db.query(
      `SELECT e.id_etiqueta, e.nombre, e.color_hex
       FROM avisos_etiquetas ae
       JOIN etiquetas e ON e.id_etiqueta = ae.id_etiqueta
       WHERE ae.id_aviso = ?`,
      [id]
    );
    rows[0].etiquetas = etiquetas;
    return rows[0];
  },

  /** Actualizar aviso */
  async update(id, { titulo, contenido, prioridad, id_categoria, id_curso, es_global,
                      archivo_adjunto, fecha_vencimiento, requiere_confirmacion }) {
    await db.query(
      `UPDATE avisos SET titulo=?, contenido=?, prioridad=?, id_categoria=?,
       id_curso=?, es_global=?, archivo_adjunto=?, fecha_vencimiento=?,
       requiere_confirmacion=?
       WHERE id_aviso=?`,
      [titulo, contenido, prioridad, id_categoria || null, id_curso || null,
       es_global ? 1 : 0, archivo_adjunto || null, fecha_vencimiento || null,
       requiere_confirmacion ? 1 : 0, id]
    );
  },

  /** Eliminar (soft delete) */
  async delete(id) {
    await db.query('UPDATE avisos SET activo=0 WHERE id_aviso=?', [id]);
  },

  /** Registrar lectura */
  async markRead(id_aviso, id_usuario) {
    await db.query(
      `INSERT INTO lecturas_avisos (id_aviso, id_usuario)
       VALUES (?,?)
       ON DUPLICATE KEY UPDATE leido_en = NOW()`,
      [id_aviso, id_usuario]
    );
  },

  /** Confirmar lectura explícitamente */
  async confirmRead(id_aviso, id_usuario) {
    await db.query(
      `INSERT INTO lecturas_avisos (id_aviso, id_usuario, confirmado, confirmado_en)
       VALUES (?,?,1,NOW())
       ON DUPLICATE KEY UPDATE confirmado=1, confirmado_en=NOW()`,
      [id_aviso, id_usuario]
    );
  },

  /** Obtener lecturas de un aviso (para docente/admin) */
  async getReadStatus(id_aviso) {
    const [rows] = await db.query(
      `SELECT u.id_usuario, u.nombre, u.apellido, la.leido_en, la.confirmado, la.confirmado_en
       FROM lecturas_avisos la
       JOIN usuarios u ON u.id_usuario = la.id_usuario
       WHERE la.id_aviso = ?`,
      [id_aviso]
    );
    return rows;
  },

  /** Agregar etiqueta a aviso */
  async addEtiqueta(id_aviso, id_etiqueta) {
    await db.query(
      'INSERT IGNORE INTO avisos_etiquetas (id_aviso, id_etiqueta) VALUES (?,?)',
      [id_aviso, id_etiqueta]
    );
  },

  /** Obtener FCM tokens de destinatarios de un aviso para push */
  async getRecipientsTokens(id_aviso) {
    const [rows] = await db.query(
      `SELECT DISTINCT u.fcm_token
       FROM avisos a
       JOIN estudiantes_cursos ec ON ec.id_curso = a.id_curso AND ec.activo = 1
       JOIN acudiente_estudiante ae ON ae.id_estudiante = ec.id_estudiante
       JOIN usuarios u ON u.id_usuario = ae.id_acudiente AND u.activo = 1
       WHERE a.id_aviso = ? AND u.fcm_token IS NOT NULL`,
      [id_aviso]
    );
    return rows.map(r => r.fcm_token);
  },
};

module.exports = Aviso;