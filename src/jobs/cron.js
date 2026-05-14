// ============================================================
//  src/jobs/cron.js
//  Tareas programadas: recordatorios y notificaciones push
// ============================================================

'use strict';

const cron   = require('node-cron');
const db     = require('../config/db');
const { sendPushNotification } = require('../config/firebase');

/**
 * Procesa recordatorios pendientes de enviar.
 * Corre cada minuto.
 */
const processReminders = async () => {
  try {
    const [reminders] = await db.query(
      `SELECT r.id_recordatorio, r.id_usuario, r.titulo, r.mensaje,
              u.fcm_token
       FROM recordatorios r
       JOIN usuarios u ON u.id_usuario = r.id_usuario
       WHERE r.activo = 1
         AND r.enviado = 0
         AND r.fecha_hora <= NOW()
         AND u.fcm_token IS NOT NULL`
    );

    for (const reminder of reminders) {
      await sendPushNotification({
        token: reminder.fcm_token,
        title: `⏰ ${reminder.titulo}`,
        body:  reminder.mensaje || 'Tienes un recordatorio pendiente',
        data:  { tipo: 'recordatorio', id: String(reminder.id_recordatorio) },
      });

      await db.query(
        'UPDATE recordatorios SET enviado=1, enviado_en=NOW() WHERE id_recordatorio=?',
        [reminder.id_recordatorio]
      );
    }

    if (reminders.length > 0) {
      console.log(`⏰  [Cron] Recordatorios enviados: ${reminders.length}`);
    }
  } catch (err) {
    console.error('❌  [Cron] Error procesando recordatorios:', err.message);
  }
};

/**
 * Limpia refresh tokens expirados.
 * Corre cada día a las 3:00 AM.
 */
const cleanExpiredTokens = async () => {
  try {
    const [result] = await db.query(
      'DELETE FROM refresh_tokens WHERE expira_en < NOW() OR revocado = 1'
    );
    console.log(`🧹  [Cron] Tokens expirados eliminados: ${result.affectedRows}`);
  } catch (err) {
    console.error('❌  [Cron] Error limpiando tokens:', err.message);
  }
};

/**
 * Notificaciones de tareas próximas a vencer (24 horas antes).
 * Corre cada día a las 7:00 AM.
 */
const notifyUpcomingTasks = async () => {
  try {
    const [tasks] = await db.query(
      `SELECT t.id_tarea, t.titulo, t.materia, t.fecha_entrega,
              u.fcm_token, u.id_usuario
       FROM tareas t
       JOIN estudiantes_cursos ec ON ec.id_curso = t.id_curso AND ec.activo=1
       JOIN acudiente_estudiante ae ON ae.id_estudiante = ec.id_estudiante
       JOIN usuarios u ON u.id_usuario = ae.id_acudiente AND u.activo=1
       WHERE t.activo=1
         AND t.fecha_entrega = DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)
         AND u.fcm_token IS NOT NULL`
    );

    // Deduplica por usuario + tarea
    const seen = new Set();
    for (const task of tasks) {
      const key = `${task.id_usuario}-${task.id_tarea}`;
      if (seen.has(key)) continue;
      seen.add(key);

      await sendPushNotification({
        token: task.fcm_token,
        title: `📚 Tarea para mañana: ${task.titulo}`,
        body:  `${task.materia} — Entrega: ${task.fecha_entrega}`,
        data:  { tipo: 'tarea', id: String(task.id_tarea) },
      });
    }

    if (tasks.length > 0) {
      console.log(`📚  [Cron] Alertas de tareas próximas: ${seen.size}`);
    }
  } catch (err) {
    console.error('❌  [Cron] Error en alertas de tareas:', err.message);
  }
};

/**
 * Iniciar todos los cron jobs
 */
const startCronJobs = () => {
  // Recordatorios: cada minuto
  cron.schedule('* * * * *', processReminders, {
    name: 'recordatorios',
    timezone: 'America/Bogota',
  });

  // Limpieza de tokens: cada día a las 3 AM
  cron.schedule('0 3 * * *', cleanExpiredTokens, {
    name: 'cleanup-tokens',
    timezone: 'America/Bogota',
  });

  // Alertas de tareas: cada día a las 7 AM
  cron.schedule('0 7 * * *', notifyUpcomingTasks, {
    name: 'task-alerts',
    timezone: 'America/Bogota',
  });

  console.log('⏱️   Cron jobs iniciados (zona horaria: America/Bogota)');
};

module.exports = { startCronJobs };
