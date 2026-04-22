const ah      = require("../utils/async");
const User    = require("../models/User");
const Teacher = require("../models/Teacher");
const { sendEmail, tpl } = require("../utils/email");

// ✅ Add teacher + send credentials via email
exports.add = ah(async (req, res) => {
  const { name, email, phone, subject, assignedClass, qualification } = req.body;

  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(400).json({ success: false, message: "Email already registered" });

  const pw  = Math.random().toString(36).slice(-8) + "T@1";
  const emp = "EMP" + Date.now();

  const u = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    password: pw,
    role: "teacher",
  });

  const t = await Teacher.create({
    userId: u._id,
    subject,
    assignedClass,
    qualification,
    employeeId: emp,
  });

  sendEmail({ to: email, ...tpl.teacherWelcome(name, email, pw, assignedClass) }).catch(() => {});

  res.status(201).json({
    success: true,
    message: "Teacher added. Credentials sent via email.",
    data: { user: u, teacher: t },
  });
});

// ✅ List all teachers
exports.list = ah(async (req, res) => {
  const data = await Teacher.find()
    .populate("userId", "name email phone isActive lastLogin profilePhoto")
    .lean();

  res.json({ success: true, count: data.length, data });
});

// ✅ Update teacher (name/phone on User, subject/qualification/class on Teacher)
exports.update = ah(async (req, res) => {
  const { name, phone, subject, qualification, assignedClass } = req.body;

  // Find teacher and populate linked user
  const teacher = await Teacher.findById(req.params.id).populate("userId");
  if (!teacher)
    return res.status(404).json({ success: false, message: "Teacher not found" });

  // Update Teacher-specific fields
  if (subject       !== undefined) teacher.subject       = subject;
  if (qualification !== undefined) teacher.qualification = qualification;
  if (assignedClass !== undefined) teacher.assignedClass = assignedClass;
  await teacher.save();

  // Update linked User's name and phone
  if (teacher.userId) {
    const user = await User.findById(teacher.userId._id ?? teacher.userId);
    if (user) {
      if (name  !== undefined) user.name  = name;
      if (phone !== undefined) user.phone = phone;
      await user.save();
    }
  }

  // Return fresh populated data
  const updated = await Teacher.findById(req.params.id).populate(
    "userId",
    "name email phone isActive"
  );

  res.json({ success: true, message: "Teacher updated successfully", data: updated });
});

// ✅ Deactivate (soft delete) a teacher
exports.remove = ah(async (req, res) => {
  const t = await Teacher.findById(req.params.id);
  if (!t) return res.status(404).json({ success: false, message: "Not found" });

  await User.findByIdAndUpdate(t.userId, { isActive: false });
  res.json({ success: true, message: "Teacher deactivated" });
});

// ✅ Get teacher's own class + students (teacher role)
exports.myClass = ah(async (req, res) => {
  const Student = require("../models/Student");

  const t = await Teacher.findOne({ userId: req.user._id }).lean();
  if (!t)
    return res.status(404).json({ success: false, message: "Teacher profile not found" });

  const students = await Student.find({ class: t.assignedClass, isActive: true }).lean();
  res.json({
    success: true,
    assignedClass: t.assignedClass,
    count: students.length,
    data: students,
  });
});

// ✅ Toggle canMarkTeacherAttendance permission
exports.toggleAttendancePermission = ah(async (req, res) => {
  const teacher = await Teacher.findById(req.params.id);
  if (!teacher)
    return res.status(404).json({ success: false, message: "Teacher not found" });

  teacher.canMarkTeacherAttendance = !teacher.canMarkTeacherAttendance;
  await teacher.save();

  res.json({
    success: true,
    message: `Attendance permission ${teacher.canMarkTeacherAttendance ? "granted" : "revoked"}`,
    data: teacher,
  });
});