// ============================================================
//  src/middlewares/auth.middleware.js
//  Verificación de token JWT en cabecera Authorization
// ============================================================

'use strict';

const { verifyAccessToken } = require('../utils/jwt');
const { unauthorized }      = require('../views/response');

/**
 * Middleware que valida el Bearer token JWT.
 * Si es válido, añade req.user = { id_usuario, rol, email }.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'Token de acceso requerido');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id_usuario: decoded.id_usuario,
      rol:        decoded.rol,
      email:      decoded.email,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expirado, por favor renueva tu sesión');
    }
    return unauthorized(res, 'Token inválido');
  }
};

module.exports = { authenticate };