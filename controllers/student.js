const ah = require("../utils/async");
const Student = require("../models/Student");
const User = require("../models/User");
const { sendEmail, tpl } = require("../utils/email");
const xlsx = require("xlsx");

// Add Student
exports.add = ah(async (req, res) => {
  const {
    name,
    classNo,
    section,
    rollNo,
    dob,
    address,
    bloodGroup,
    parentName,
    parentEmail,
    parentPhone,
  } = req.body;

  if (!parentPhone) {
    return res
      .status(400)
      .json({ success: false, message: "Parent phone required" });
  }

  const loginEmail =
    parentEmail && parentEmail.trim()
      ? parentEmail.toLowerCase()
      : parentPhone.replace(/\s+/g, "") + "@starkids.local";

  const pw = Math.random().toString(36).slice(-8) + "@1";
  const adm =
    "SK" +
    Date.now() +
    Math.random().toString(36).slice(2, 5).toUpperCase();

  let parent = await User.findOne({ email: loginEmail });

  if (parent) {
    if (parent.isActive) {
      return res.status(400).json({
        success: false,
        message: "Parent already exists",
      });
    }

    parent.isActive = true;
    parent.password = pw;
    parent.name = parentName;
    parent.phone = parentPhone;
    await parent.save();
  } else {
    parent = await User.create({
      name: parentName,
      email: loginEmail,
      phone: parentPhone,
      password: pw,
      role: "parent",
      isActive: true,
    });
  }

  const student = await Student.create({
    name,
    class: classNo,
    section,
    rollNo,
    dob,
    address,
    bloodGroup,
    parentId: parent._id,
    admissionNo: adm,
  });

  if (parentEmail && parentEmail.trim()) {
    sendEmail({
      to: parentEmail,
      ...tpl.parentWelcome(parentName, name, parentEmail, pw),
    }).catch(() => {});
  }

  res.status(201).json({
    success: true,
    message:
      parentEmail && parentEmail.trim()
        ? "Student added. Credentials sent via email."
        : "Student added. No email — give credentials manually to parent.",
    credentials: {
      loginId:
        parentEmail && parentEmail.trim() ? parentEmail : parentPhone,
      password: pw,
      hasEmail: !!(parentEmail && parentEmail.trim()),
    },
    data: { student, admissionNo: adm },
  });
});

// List Students
exports.list = ah(async (req, res) => {
  const filter = { isActive: true };

  if (req.query.class) {
    filter.class = Number(req.query.class);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 100;

  const data = await Student.find(filter)
    .populate("parentId", "name email phone fcmToken")
    .sort({ class: 1, name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await Student.countDocuments(filter);

  res.json({ success: true, count: data.length, total, page, data });
});

// Get Student
exports.get = ah(async (req, res) => {
  const s = await Student.findById(req.params.id)
    .populate("parentId", "name email phone")
    .lean();

  if (!s) {
    return res
      .status(404)
      .json({ success: false, message: "Student not found" });
  }

  res.json({ success: true, data: s });
});

// Update Student
exports.update = ah(async (req, res) => {
  const s = await Student.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  ).lean();

  res.json({ success: true, data: s });
});

// Remove Student
exports.remove = ah(async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student)
    return res.status(404).json({ success: false, message: "Student not found" });

  student.isActive = false;
  await student.save();

  if (student.parentId) {
    await User.findByIdAndUpdate(student.parentId, { isActive: false });
  }

  const { StudentFee } = require("../models/Fee");
  const Attendance     = require("../models/Attendance");
  const ExamMark       = require("../models/ExamMark");
  const Leave          = require("../models/Leave");

  await Promise.all([
    StudentFee.deleteMany({ studentId: student._id }),
    Attendance.deleteMany({ studentId: student._id }),
    ExamMark.deleteMany({ studentId: student._id }),
    Leave.deleteMany({ studentId: student._id }),
  ]);

  res.json({ success: true, message: "Student and all related records removed" });
});
// Promote All
exports.promoteAll = ah(async (req, res) => {
  const results = await Promise.all(
    [6, 5, 4, 3, 2, 1].map((c) =>
      Student.updateMany(
        { class: c, isActive: true },
        { $set: { class: c + 1 } }
      )
    )
  );

  const total = results.reduce(
    (sum, r) => sum + r.modifiedCount,
    0
  );

  res.json({
    success: true,
    message: total + " students promoted!",
  });
});

// Bulk Upload
exports.bulkUpload = ah(async (req, res) => {
  const wb = xlsx.read(req.file.buffer, { type: "buffer" });
  const rows = xlsx.utils.sheet_to_json(
    wb.Sheets[wb.SheetNames[0]]
  );

  const out = [];
  let counter = 0;

  for (const row of rows) {
    try {
      counter++;

      const phone = (row.parentPhone || "")
        .toString()
        .replace(/\s+/g, "");

      const loginEmail = row.parentEmail
        ? row.parentEmail.toLowerCase()
        : phone + "@starkids.local";

      const pw = Math.random().toString(36).slice(-8) + "@1";

      const adm =
        "SK" +
        Date.now() +
        counter +
        Math.random().toString(36).slice(2, 4).toUpperCase();

      let parent = await User.findOne({ email: loginEmail });

      if (parent) {
        if (parent.isActive) {
          out.push({
            name: row.name,
            ok: false,
            err: "Parent already exists",
          });
          continue;
        }

        parent.isActive = true;
        parent.password = pw;
        parent.name = row.parentName;
        parent.phone = row.parentPhone;
        await parent.save();
      } else {
        parent = await User.create({
          name: row.parentName,
          email: loginEmail,
          phone: row.parentPhone,
          password: pw,
          role: "parent",
          isActive: true,
        });
      }

      const stu = await Student.create({
        name: row.name,
        class: row.class,
        section: row.section || "A",
        rollNo: row.rollNo,
        parentId: parent._id,
        admissionNo: adm,
      });

      if (row.parentEmail) {
        sendEmail({
          to: row.parentEmail,
          ...tpl.parentWelcome(
            row.parentName,
            row.name,
            row.parentEmail,
            pw
          ),
        }).catch(() => {});
      }

      out.push({
        name: stu.name,
        ok: true,
        loginId: row.parentEmail || row.parentPhone,
        password: pw,
      });
    } catch (e) {
      out.push({
        name: row.name,
        ok: false,
        err: e.message,
      });
    }
  }

  const ok = out.filter((r) => r.ok).length;

  res.json({
    success: true,
    message: ok + "/" + rows.length + " students added",
    results: out,
  });
});

// My Child
exports.myChild = ah(async (req, res) => {
  const data = await Student.find({
    parentId: req.user._id,
    isActive: true,
  }).lean();

  res.json({ success: true, data });
});

// Get Credentials
exports.getCredentials = ah(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate("parentId", "name email phone")
    .lean();

  if (!student) {
    return res
      .status(404)
      .json({ success: false, message: "Student not found" });
  }

  const parent = student.parentId;

  const hasEmail =
    parent.email &&
    !parent.email.endsWith("@starkids.local");

  res.json({
    success: true,
    data: {
      parentName: parent.name,
      loginId: hasEmail ? parent.email : parent.phone,
      hasEmail,
      note: hasEmail
        ? "Credentials were sent to email."
        : "No email — share login ID manually.",
    },
  });
});

// Reset Parent Password
exports.resetParentPassword = ah(async (req, res) => {
  const student = await Student.findById(req.params.id)
    .populate("parentId")
    .lean();

  if (!student) {
    return res
      .status(404)
      .json({ success: false, message: "Student not found" });
  }

  const newPw = Math.random().toString(36).slice(-8) + "@1";

  const parent = await User.findById(student.parentId._id);

  if (!parent) {
    return res
      .status(404)
      .json({ success: false, message: "Parent not found" });
  }

  parent.password = newPw;
  await parent.save();

  const hasEmail =
    parent.email &&
    !parent.email.endsWith("@starkids.local");

  if (hasEmail) {
    sendEmail({
      to: parent.email,
      subject: "New Login Credentials — Star Kids",
      html: `<p>Your new password is: <b>${newPw}</b></p>`,
    }).catch(() => {});
  }

  res.json({
    success: true,
    message: hasEmail
      ? "Password reset and emailed."
      : "Password reset. Share manually.",
    newPassword: newPw,
    loginId: hasEmail ? parent.email : parent.phone,
  });
});