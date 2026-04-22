const r = require("express").Router();
const c = require("../controllers/marks");
const { protect, role } = require("../middleware/auth");
r.post("/",            protect, role("teacher"),                  c.enter);
r.post("/bulk",        protect, role("teacher"),                  c.enterBulk);
r.get("/class/:classNo", protect, role("principal","teacher"),    c.byClass);
r.get("/student/:id",  protect,                                   c.byStudent);
module.exports = r;
