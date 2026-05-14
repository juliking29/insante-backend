// ============================================================
//  src/config/firebase.js
//  Inicialización de Firebase Admin SDK para notificaciones push
// ============================================================

'use strict';

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

let firebaseApp = null;

const initFirebase = () => {
  try {
    const serviceAccountPath = path.resolve(
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
      './src/config/firebase-service-account.json'
    );

    if (!fs.existsSync(serviceAccountPath)) {
      console.warn('⚠️   Firebase: archivo de service account no encontrado.');
      console.warn('    Las notificaciones push estarán deshabilitadas.');
      return null;
    }

    const serviceAccount = require(serviceAccountPath);

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId:  process.env.FIREBASE_PROJECT_ID,
    });

    console.log('✅  Firebase Admin SDK inicializado correctamente');
    return firebaseApp;
  } catch (err) {
    console.error('❌  Error al inicializar Firebase:', err.message);
    return null;
  }
};

// Enviar notificación push a un token FCM específico
const sendPushNotification = async ({ token, title, body, data = {} }) => {
  if (!firebaseApp || !token) return null;

  try {
    const message = {
      token,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'insante_channel',
          color: '#1A3A6B',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    };

    const response = await admin.messaging().send(message);
    return response;
  } catch (err) {
    console.error('Error al enviar push:', err.message);
    return null;
  }
};

// Enviar notificación push a múltiples tokens
const sendMulticastPush = async ({ tokens, title, body, data = {} }) => {
  if (!firebaseApp || !tokens || tokens.length === 0) return null;

  try {
    const message = {
      tokens,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        priority: 'high',
        notification: { sound: 'default', channelId: 'insante_channel', color: '#1A3A6B' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    return response;
  } catch (err) {
    console.error('Error al enviar multicast push:', err.message);
    return null;
  }
};

module.exports = { initFirebase, sendPushNotification, sendMulticastPush };