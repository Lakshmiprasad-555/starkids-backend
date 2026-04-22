const { getMessaging } = require("../config/firebase");

const push = async ({ token, title, body }) => {
  if (!token) return;
  try {
    await getMessaging().send({
      token, notification: { title, body },
      android: { priority: "high", notification: { sound: "default" } },
      apns: { payload: { aps: { sound: "default" } } },
    });
  } catch (e) { console.error("Push error:", e.message); }
};

const pushMany = async ({ tokens, title, body }) => {
  const valid = [...new Set((tokens || []).filter(Boolean))];
  if (!valid.length) return;
  try {
    const r = await getMessaging().sendEachForMulticast({
      tokens: valid, notification: { title, body },
      android: { priority: "high", notification: { sound: "default" } },
      apns: { payload: { aps: { sound: "default" } } },
    });
    console.log("Push bulk: ok=" + r.successCount + " fail=" + r.failureCount);
  } catch (e) { console.error("Push bulk error:", e.message); }
};

module.exports = { push, pushMany };
