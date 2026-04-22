const r      = require("express").Router();
const c      = require("../controllers/gallery");
const multer = require("multer");
const up     = multer({ storage: multer.memoryStorage() });
const { protect, role } = require("../middleware/auth");
r.post("/",      protect, role("principal","teacher"), up.single("photo"), c.upload);
r.get("/",       protect,                              c.list);
r.delete("/:id", protect, role("principal","teacher"), c.remove);
module.exports = r;
