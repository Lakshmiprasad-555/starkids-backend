const ah         = require("../utils/async");
const Student    = require("../models/Student");
const User       = require("../models/User");
const Attendance = require("../models/Attendance");
const {StudentFee } = require("../models/Fee");
const Notice     = require("../models/Notice");
const Homework   = require("../models/Homework");

exports.principal = ah(async (req, res) => {
  const today = new Date(); today.setHours(0,0,0,0);
  // All in parallel — fast
  const [totalStudents, totalTeachers, todayAtt, pendingFees, recentNotices] = await Promise.all([
    Student.countDocuments({ isActive: true }),
    User.countDocuments({ role: "teacher", isActive: true }),
    Attendance.find({ date: today }).lean(),
    StudentFee.countDocuments({ status: { $in: ["unpaid","partial"] } }),
    Notice.find({ isActive: true }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  res.json({ success: true, data: { totalStudents, totalTeachers,
    attendance: { present: todayAtt.filter(a=>a.status==="present").length, absent: todayAtt.filter(a=>a.status==="absent").length },
    pendingFees, recentNotices,
  }});
});

exports.teacher = ah(async (req, res) => {
  const Teacher = require("../models/Teacher");
  const t = await Teacher.findOne({ userId: req.user._id }).lean();
  if (!t) return res.status(404).json({ success: false, message: "Teacher profile not found" });
  const today = new Date(); today.setHours(0,0,0,0);
  const [count, att, hw, notices] = await Promise.all([
    Student.countDocuments({ class: t.assignedClass, isActive: true }),
    Attendance.find({ classNo: t.assignedClass, date: today }).lean(),
    Homework.countDocuments({ classNo: t.assignedClass, isActive: true }),
    Notice.find({ isActive: true, target: { $in: ["teachers","all"] } }).sort({ createdAt:-1 }).limit(5).lean(),
  ]);
  res.json({ success: true, data: { assignedClass: t.assignedClass, totalStudents: count,
    attendance: { present: att.filter(a=>a.status==="present").length, absent: att.filter(a=>a.status==="absent").length },
    pendingHomework: hw, notices,
    canMarkTeacherAttendance: t.canMarkTeacherAttendance || false,
  }});
});

exports.parent = ah(async (req, res) => {
  const children = await Student.find({ parentId: req.user._id, isActive: true }).lean();
  if (!children.length) return res.json({ success: true, data: { children: [] } });
  const child = children[0];
  const today = new Date(); today.setHours(0,0,0,0);
  const [att, fees, hw, notices] = await Promise.all([
    Attendance.findOne({ studentId: child._id, date: today }).lean(),
    StudentFee.find({ studentId: child._id, status: { $in: ["unpaid","partial"] } }).lean(),
    Homework.find({ classNo: child.class, isActive: true }).sort({ createdAt:-1 }).limit(5).lean(),
    Notice.find({ isActive: true, target: { $in: ["parents","all"] } }).sort({ createdAt:-1 }).limit(5).lean(),
  ]);
  res.json({ success: true, data: {
    children,
    todayAttendance: att?.status || "not marked",
    pendingFees: fees.length,
    totalDue: fees.reduce((s,f)=>s+(f.amount-(f.paidAmount||0)),0),
    recentHomework: hw, notices,
  }});
});
