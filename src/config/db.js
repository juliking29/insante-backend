// ============================================================
//  src/config/db.js
//  Conexión MySQL con pool de conexiones
// ============================================================

'use strict';

const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'insante_db',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '+00:00',
  charset:            'utf8mb4',
});

// Verificar conexión al iniciar
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL conectado correctamente a:', process.env.DB_NAME);
    conn.release();
  } catch (err) {
    console.error('❌  Error al conectar MySQL:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;