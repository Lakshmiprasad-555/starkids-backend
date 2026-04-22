const ah         = require("../utils/async");
const Attendance = require("../models/Attendance");
const Student    = require("../models/Student");
const { pushMany } = require("../utils/notify");

exports.mark = ah(async (req, res) => {
  const { classNo, date, records } = req.body;
  if (!records || !records.length)
    return res.status(400).json({ success: false, message: "records array required" });

  await Attendance.bulkWrite(records.map(r => ({
    updateOne: {
      filter: { studentId: r.studentId, date: new Date(date) },
      update: { $set: { status: r.status, classNo, markedBy: req.user._id, remarks: r.remarks || "" } },
      upsert: true,
    },
  })));

  const absentIds = records.filter(r => r.status === "absent").map(r => r.studentId);
  if (absentIds.length) {
    Student.find({ _id: { $in: absentIds } }).populate("parentId", "fcmToken").lean()
      .then(ss => pushMany({ tokens: ss.map(s => s.parentId?.fcmToken), title: "Attendance Alert — Star Kids", body: "Your child was absent today. Contact school if incorrect." }))
      .catch(() => {});
  }

  res.json({ success: true, message: "Attendance saved for " + records.length + " students" });
});

exports.byClass = ah(async (req, res) => {
  const { class: c, date } = req.query;
  if (!c || !date)
    return res.status(400).json({ success: false, message: "class and date query params required" });
  const data    = await Attendance.find({ classNo: Number(c), date: new Date(date) }).populate("studentId", "name rollNo").lean();
  const present = data.filter(a => a.status === "present").length;
  const absent  = data.filter(a => a.status === "absent").length;
  res.json({ success: true, data, summary: { present, absent, late: data.length - present - absent } });
});

// FIX: parents can only see their own child's attendance
exports.byStudent = ah(async (req, res) => {
  const studentId = req.params.id;

  // If requester is a parent, verify this student belongs to them
  if (req.user.role === "parent") {
    const child = await Student.findOne({ _id: studentId, parentId: req.user._id }).lean();
    if (!child) return res.status(403).json({ success: false, message: "Access denied" });
  }

  const filter = { studentId };
  if (req.query.from && req.query.to)
    filter.date = { $gte: new Date(req.query.from), $lte: new Date(req.query.to) };

  const data    = await Attendance.find(filter).sort({ date: -1 }).lean();
  const present = data.filter(r => r.status === "present").length;
  const absent  = data.filter(r => r.status === "absent").length;
  const late    = data.filter(r => r.status === "late").length;
  const total   = data.length;
  res.json({ success: true, data, summary: { total, present, absent, late, percentage: total ? Math.round(((present + late) / total) * 100) + "%" : "0%" } });
});

exports.schoolReport = ah(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const stats = await Promise.all([1, 2, 3, 4, 5, 6, 7].map(async c => {
    const recs    = await Attendance.find({ classNo: c, date }).lean();
    const present = recs.filter(r => r.status === "present").length;
    return { class: c, total: recs.length, present, absent: recs.length - present };
  }));
  res.json({ success: true, date, data: stats });
});
