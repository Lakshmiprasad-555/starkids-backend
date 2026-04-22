const ah       = require("../utils/async");
const Homework = require("../models/Homework");
const Student  = require("../models/Student");
const { pushMany }   = require("../utils/notify");
const { uploadFile } = require("../utils/upload");

exports.add = ah(async (req, res) => {
  const { classNo, subject, title, description, dueDate } = req.body;
  let attachment = "";
  if (req.file) attachment = await uploadFile(req.file.buffer, req.file.originalname, "homework");

  const hw = await Homework.create({ classNo, subject, title, description, dueDate, attachment, teacherId: req.user._id });

  Student.find({ class: Number(classNo), isActive: true }).populate("parentId","fcmToken").lean()
    .then(ss => pushMany({ tokens: ss.map(s => s.parentId?.fcmToken), title: "New Homework — " + subject, body: title + " | Due: " + new Date(dueDate).toDateString() }))
    .catch(()=>{});

  res.status(201).json({ success: true, message: "Homework added", data: hw });
});

exports.list = ah(async (req, res) => {
  const f = { isActive: true };
  if (req.query.class) f.classNo = Number(req.query.class);
  const data = await Homework.find(f).populate("teacherId","name").sort({ createdAt: -1 }).lean();
  res.json({ success: true, count: data.length, data });
});

exports.remove = ah(async (req, res) => {
  await Homework.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: "Homework deleted" });
});
