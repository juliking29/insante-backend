// ============================================================
//  app.js
//  Configuración de la aplicación Express — INSANTE API REST
//  Separado de server.js para facilitar pruebas unitarias
// ============================================================

'use strict';

require('dotenv').config();

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');
const path         = require('path');

// ── Rutas ──────────────────────────────────────────────────
const authRoutes        = require('./src/routes/auth.routes');
const usuariosRoutes    = require('./src/routes/usuarios.routes');
const avisosRoutes      = require('./src/routes/avisos.routes');
const tareasRoutes      = require('./src/routes/tareas.routes');
const actividadesRoutes = require('./src/routes/actividades.routes');
const mensajesRoutes    = require('./src/routes/mensajes.routes');
const notifRoutes       = require('./src/routes/notificaciones.routes');
const cursosRoutes      = require('./src/routes/cursos.routes');
const categoriasRoutes  = require('./src/routes/categorias.routes');
const agendaRoutes      = require('./src/routes/agenda.routes');

const app = express();

// ── Seguridad ──────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin:         process.env.CORS_ORIGIN || '*',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting global ───────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutos
  max:      200,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.' },
});
app.use(globalLimiter);

// Rate limit estricto para autenticación
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Demasiados intentos de autenticación.' },
});

// ── Parsers ────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Logging HTTP ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Archivos estáticos ─────────────────────────────────────
// Los archivos subidos (adjuntos) se sirven desde /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health check ───────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success:     true,
    service:     'INSANTE API',
    version:     '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp:   new Date().toISOString(),
  });
});

// ── Rutas API v1 ───────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`,           authLimiter, authRoutes);
app.use(`${API}/usuarios`,       usuariosRoutes);
app.use(`${API}/avisos`,         avisosRoutes);
app.use(`${API}/tareas`,         tareasRoutes);
app.use(`${API}/actividades`,    actividadesRoutes);
app.use(`${API}/mensajes`,       mensajesRoutes);
app.use(`${API}/notificaciones`, notifRoutes);
app.use(`${API}/cursos`,         cursosRoutes);
app.use(`${API}/categorias`,     categoriasRoutes);
app.use(`${API}/agenda`,         agendaRoutes);

// ── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
});

// ── Error handler global ───────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌  Error no manejado:', err);

  // Error de Multer (archivo muy grande o tipo no permitido)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'El archivo supera el límite de 10 MB.' });
  }
  if (err.message && err.message.startsWith('Tipo de archivo no permitido')) {
    return res.status(400).json({ success: false, message: err.message });
  }

  res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

module.exports = app;