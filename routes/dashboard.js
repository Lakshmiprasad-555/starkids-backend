const r = require("express").Router();
const c = require("../controllers/dashboard");
const { protect, role } = require("../middleware/auth");
r.get("/principal", protect, role("principal"),         c.principal);
r.get("/teacher",   protect, role("teacher"),           c.teacher);
r.get("/parent",    protect, role("parent"),            c.parent);
module.exports = r;
