const r = require("express").Router();
const c = require("../controllers/auth");
const { protect, role } = require("../middleware/auth");
r.post("/login",           c.login);
r.get("/profile",          protect, c.profile);
r.put("/fcm-token",        protect, c.updateFcm);
r.put("/change-password",  protect, c.changePw);
r.put("/reset-password",   protect, role("principal"), c.resetPw);
module.exports = r;
