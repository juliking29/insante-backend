// ============================================================
//  src/utils/jwt.js
//  Firma y verificación de tokens JWT
// ============================================================

'use strict';

const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_SECRET          || 'insante_secret_access';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'insante_secret_refresh';
const ACCESS_EXPIRES = process.env.JWT_EXPIRES_IN      || '15m';
const REFRESH_EXPIRES= process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Genera un access token JWT.
 * @param {object} payload  - { id_usuario, rol, email }
 * @returns {string} token
 */
const signAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
};

/**
 * Genera un refresh token JWT.
 * @param {object} payload  - { id_usuario }
 * @returns {string} token
 */
const signRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
};

/**
 * Verifica y decodifica un access token.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws si el token es inválido o expiró
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};

/**
 * Verifica y decodifica un refresh token.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws si el token es inválido o expiró
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

/**
 * Calcula la fecha de expiración del refresh token.
 * @returns {Date}
 */
const refreshTokenExpiry = () => {
  const days = parseInt(REFRESH_EXPIRES) || 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  refreshTokenExpiry,
};