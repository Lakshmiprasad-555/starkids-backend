const admin = require("firebase-admin");
let ready = false;

const initFirebase = () => {
  if (ready || admin.apps.length) return;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey || !process.env.FIREBASE_PROJECT_ID) {
    console.warn("Firebase env vars missing — push notifications disabled");
    return;
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        privateKey:  privateKey.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    ready = true;
    console.log("Firebase ready:", process.env.FIREBASE_PROJECT_ID);
  } catch (e) {
    console.error("Firebase init failed:", e.message);
  }
};

const getStorage   = () => admin.storage().bucket();
const getMessaging = () => admin.messaging();
module.exports = { initFirebase, getStorage, getMessaging, admin };
