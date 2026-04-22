const ah                = require("../utils/async");
const TeacherAttendance = require("../models/TeacherAttendance");
const Teacher           = require("../models/Teacher");

// Mark attendance for all teachers (principal OR designated teacher)
exports.mark = ah(async (req, res) => {
  const { date, records } = req.body;
  if (!records || !records.length)
    return res.status(400).json({ success: false, message: "records array required" });

  // If caller is a teacher, verify they have permission
  if (req.user.role === "teacher") {
    const t = await Teacher.findOne({ userId: req.user._id }).lean();
    if (!t || !t.canMarkTeacherAttendance)
      return res.status(403).json({ success: false, message: "Not authorized to mark teacher attendance" });
  }

  await TeacherAttendance.bulkWrite(records.map(r => ({
    updateOne: {
      filter: { teacherId: r.teacherId, date: new Date(date) },
      update: { $set: { status: r.status, markedBy: req.user._id, remarks: r.remarks || "" } },
      upsert: true,
    },
  })));

  res.json({ success: true, message: "Teacher attendance saved for " + records.length + " teachers" });
});

// Get teacher attendance for a specific date
exports.byDate = ah(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const data = await TeacherAttendance.find({ date })
    .populate({ path: "teacherId", populate: { path: "userId", select: "name email phone" } })
    .lean();
  const present = data.filter(r => r.status === "present").length;
  const absent  = data.filter(r => r.status === "absent").length;
  res.json({ success: true, data, summary: { present, absent, late: data.filter(r => r.status === "late").length, total: data.length } });
});

// Get attendance history for a single teacher
exports.byTeacher = ah(async (req, res) => {
  const filter = { teacherId: req.params.id };
  if (req.query.from && req.query.to)
    filter.date = { $gte: new Date(req.query.from), $lte: new Date(req.query.to) };
  const data    = await TeacherAttendance.find(filter).sort({ date: -1 }).lean();
  const present = data.filter(r => r.status === "present").length;
  const absent  = data.filter(r => r.status === "absent").length;
  const late    = data.filter(r => r.status === "late").length;
  const total   = data.length;
  res.json({ success: true, data, summary: { total, present, absent, late, percentage: total ? Math.round(((present + late) / total) * 100) + "%" : "0%" } });
});

// Get all teachers list for marking attendance
exports.allTeachers = ah(async (req, res) => {
  const teachers = await Teacher.find()
    .populate("userId", "name email phone isActive")
    .lean();
  res.json({ success: true, data: teachers });
});

// Toggle canMarkTeacherAttendance flag (principal only)
exports.togglePermission = ah(async (req, res) => {
  const t = await Teacher.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: "Teacher not found" });
  t.canMarkTeacherAttendance = !t.canMarkTeacherAttendance;
  await t.save();
  res.json({ success: true, message: t.canMarkTeacherAttendance ? "Permission granted" : "Permission revoked", canMark: t.canMarkTeacherAttendance });
});
