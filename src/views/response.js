// ============================================================
//  src/views/response.js
//  Helper de respuestas JSON estandarizadas
// ============================================================

'use strict';

/**
 * Envía una respuesta de éxito.
 */
const ok = (res, data = null, message = 'OK', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * Envía una respuesta de creación exitosa (201).
 */
const created = (res, data = null, message = 'Recurso creado correctamente') => {
  return res.status(201).json({
    success: true,
    message,
    data,
  });
};

/**
 * Envía una respuesta de error.
 */
const error = (res, message = 'Error interno del servidor', statusCode = 500, errors = null) => {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
};

/**
 * Respuesta 400 - Bad Request
 */
const badRequest = (res, message = 'Solicitud inválida', errors = null) => {
  return error(res, message, 400, errors);
};

/**
 * Respuesta 401 - Unauthorized
 */
const unauthorized = (res, message = 'No autorizado') => {
  return error(res, message, 401);
};

/**
 * Respuesta 403 - Forbidden
 */
const forbidden = (res, message = 'Acceso denegado') => {
  return error(res, message, 403);
};

/**
 * Respuesta 404 - Not Found
 */
const notFound = (res, message = 'Recurso no encontrado') => {
  return error(res, message, 404);
};

/**
 * Respuesta con paginación.
 */
const paginated = (res, { data, total, page, limit }) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
};

module.exports = { ok, created, error, badRequest, unauthorized, forbidden, notFound, paginated };