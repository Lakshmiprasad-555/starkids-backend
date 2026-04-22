// routes/message.js
const r = require("express").Router();
const c = require("../controllers/message");
const { protect } = require("../middleware/auth");

r.post("/",          protect, c.send);      // ✅ any logged-in user can send
r.get("/contacts",   protect, c.contacts);  // ✅ any logged-in user sees contacts
r.get("/:uid",       protect, c.thread);    // ✅ any logged-in user reads thread

module.exports = r;