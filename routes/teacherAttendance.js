const r = require("express").Router();
const c = require("../controllers/teacherAttendance");
const { protect, role } = require("../middleware/auth");

r.post("/mark",              protect, role("principal", "teacher"), c.mark);
r.get("/",                   protect, role("principal", "teacher"), c.byDate);
r.get("/teachers",           protect, role("principal", "teacher"), c.allTeachers);
r.get("/teacher/:id",        protect, role("principal", "teacher"), c.byTeacher);
r.put("/permission/:id",     protect, role("principal"),            c.togglePermission);

module.exports = r;
