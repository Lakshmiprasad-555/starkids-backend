const r = require("express").Router();
const c = require("../controllers/attendance");
const { protect, role } = require("../middleware/auth");
r.post("/mark",           protect, role("principal","teacher"), c.mark);
r.get("/report",          protect, role("principal"),          c.schoolReport);
r.get("/student/:id",     protect,                             c.byStudent);
r.get("/",                protect, role("principal","teacher"), c.byClass);
module.exports = r;
