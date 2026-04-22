const mongoose = require("mongoose");
const ah = require("../utils/async");
const TT = require("../models/Timetable");
const User = require("../models/User"); // needed for teacher lookup

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve teacherId: accepts either a valid ObjectId string OR a teacher's name.
 * Returns a valid ObjectId or throws a 400-style error.
 */
async function resolveTeacher(raw) {
  if (!raw) return undefined;

  // Already a valid ObjectId — use as-is
  if (mongoose.isValidObjectId(raw)) return raw;

  // Otherwise treat it as a name and look up the teacher
  const teacher = await User.findOne({ name: raw, role: "teacher" }).lean();
  if (!teacher) {
    const err = new Error(`Teacher not found: "${raw}"`);
    err.statusCode = 400;
    throw err;
  }
  return teacher._id;
}

// ── controllers ───────────────────────────────────────────────────────────────

exports.add = ah(async (req, res) => {
  const body = { ...req.body };
  body.teacherId = await resolveTeacher(body.teacherId);

  const d = await TT.create(body);
  res.status(201).json({ success: true, data: d });
});

exports.get = ah(async (req, res) => {
  const f = {};
  if (req.query.class) f.classNo = Number(req.query.class);

  const rows = await TT
    .find(f)
    .populate("teacherId", "name subject")
    .sort({ day: 1, startTime: 1 })
    .lean();

  const grouped = {};
  rows.forEach(r => {
    if (!grouped[r.day]) grouped[r.day] = [];
    grouped[r.day].push(r);
  });

  res.json({ success: true, data: grouped });
});

exports.remove = ah(async (req, res) => {
  const entry = await TT.findByIdAndDelete(req.params.id);
  if (!entry) return res.status(404).json({ success: false, message: "Period not found" });
  res.json({ success: true, message: "Period deleted" });
});

/**
 * POST /api/timetable/copy
 * Body: { fromClass: 3, toClass: 4 }
 * Copies all timetable entries from one class to another.
 * Existing entries for toClass are wiped first (clean copy).
 */
exports.copy = ah(async (req, res) => {
  const { fromClass, toClass } = req.body;

  if (!fromClass || !toClass) {
    return res.status(400).json({ success: false, message: "fromClass and toClass are required" });
  }
  if (Number(fromClass) === Number(toClass)) {
    return res.status(400).json({ success: false, message: "fromClass and toClass must be different" });
  }

  // Fetch source entries
  const source = await TT.find({ classNo: Number(fromClass) }).lean();
  if (!source.length) {
    return res.status(404).json({ success: false, message: `No timetable found for class ${fromClass}` });
  }

  // Delete existing timetable for target class
  await TT.deleteMany({ classNo: Number(toClass) });

  // Clone entries into the target class
  const copies = source.map(({ _id, __v, createdAt, updatedAt, ...rest }) => ({
    ...rest,
    classNo: Number(toClass),
  }));

  const inserted = await TT.insertMany(copies);
  res.status(201).json({
    success: true,
    message: `Copied ${inserted.length} periods from class ${fromClass} to class ${toClass}`,
    data: inserted,
  });
});