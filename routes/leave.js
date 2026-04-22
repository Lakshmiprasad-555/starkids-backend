const r = require("express").Router();
const c = require("../controllers/leave");
const { protect, role } = require("../middleware/auth");
r.post("/",         protect,               c.apply);
r.get("/my-leaves", protect,               c.mine);
r.get("/",          protect, role("principal"), c.list);
r.put("/:id",       protect, role("principal"), c.update);
module.exports = r;
