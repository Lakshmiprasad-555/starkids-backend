const r = require("express").Router();
const c = require("../controllers/transport");
const { protect, role } = require("../middleware/auth");
r.post("/",          protect, role("principal"), c.add);
r.get("/",           protect,                   c.list);
r.put("/:id/assign", protect, role("principal"), c.assign);
module.exports = r;
