// ============================================================
//  server.js
//  Arranque del servidor — importa la app configurada en app.js
// ============================================================

'use strict';

const app               = require('./app');
const { initFirebase }  = require('./src/config/firebase');
const { startCronJobs } = require('./src/jobs/cron');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n🚀  INSANTE API corriendo en puerto ${PORT}`);
  console.log(`📍  Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗  Base URL: http://localhost:${PORT}/api/v1\n`);

  initFirebase();
  startCronJobs();
});

module.exports = app;