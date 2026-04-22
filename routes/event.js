const r = require("express").Router();
const c = require("../controllers/event");
const { protect, role } = require("../middleware/auth");
r.post("/",      protect, role("principal"), c.create);
r.get("/",       protect,                   c.list);
r.delete("/:id", protect, role("principal"), c.remove);
module.exports = r;
