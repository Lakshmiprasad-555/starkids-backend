const r = require("express").Router();
const c = require("../controllers/timetable");
const { protect, role } = require("../middleware/auth");

r.post("/copy",  protect, role("principal"), c.copy);   // ← must be BEFORE /:id routes
r.post("/",      protect, role("principal"), c.add);
r.get("/",       protect,                   c.get);
r.delete("/:id", protect, role("principal"), c.remove);

module.exports = r;