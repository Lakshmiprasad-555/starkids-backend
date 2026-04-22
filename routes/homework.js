const r      = require("express").Router();
const c      = require("../controllers/homework");
const multer = require("multer");
const up     = multer({ storage: multer.memoryStorage() });
const { protect, role } = require("../middleware/auth");
r.post("/",      protect, role("teacher"), up.single("attachment"), c.add);
r.get("/",       protect,                                          c.list);
r.delete("/:id", protect, role("principal","teacher"),             c.remove);
module.exports = r;
