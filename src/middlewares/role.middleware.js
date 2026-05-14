// ============================================================
//  src/middlewares/role.middleware.js
//  Control de acceso basado en roles (RBAC)
// ============================================================

'use strict';

const { forbidden } = require('../views/response');

/**
 * Genera un middleware que permite solo los roles indicados.
 * Uso: router.get('/ruta', authenticate, allow('administrador', 'docente'), controller)
 *
 * @param {...string} roles - roles permitidos
 */
const allow = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Acceso denegado: sin autenticación');
    }

    if (!roles.includes(req.user.rol)) {
      return forbidden(
        res,
        `Acceso denegado: se requiere rol [${roles.join(' | ')}]. Tu rol es: ${req.user.rol}`
      );
    }

    next();
  };
};

/**
 * Permite solo al mismo usuario o a administradores.
 * Útil para rutas como GET /usuarios/:id
 */
const selfOrAdmin = (req, res, next) => {
  if (!req.user) return forbidden(res);
  const targetId = parseInt(req.params.id);
  if (req.user.rol === 'administrador' || req.user.id_usuario === targetId) {
    return next();
  }
  return forbidden(res, 'Solo puedes acceder a tu propia información');
};

module.exports = { allow, selfOrAdmin };