const ah       = require("../utils/async");
const ExamMark = require("../models/ExamMark");
const Student  = require("../models/Student");

exports.enter = ah(async (req, res) => {
  const m = await ExamMark.create(req.body);
  res.status(201).json({ success: true, data: m });
});

exports.enterBulk = ah(async (req, res) => {
  const { examType, subject, maxMarks, records } = req.body;
  const docs = records.map(r => ({ ...r, examType, subject, maxMarks }));
  await ExamMark.insertMany(docs);
  res.status(201).json({ success: true, message: docs.length + " marks entered" });
});

exports.byStudent = ah(async (req, res) => {
  const data    = await ExamMark.find({ studentId: req.params.id }).sort({ createdAt: -1 }).lean();
  const total   = data.reduce((s, m) => s + m.scored, 0);
  const maxTot  = data.reduce((s, m) => s + m.maxMarks, 0);
  res.json({ success: true, data, summary: { totalScored: total, totalMax: maxTot, percentage: maxTot ? Math.round((total/maxTot)*100)+"%" : "0%" } });
});

exports.byClass = ah(async (req, res) => {
  const students = await Student.find({ class: Number(req.params.classNo), isActive: true }).lean();
  const results  = await Promise.all(students.map(async s => {
    const marks  = await ExamMark.find({ studentId: s._id }).lean();
    const scored = marks.reduce((a,m)=>a+m.scored, 0);
    const max    = marks.reduce((a,m)=>a+m.maxMarks, 0);
    return { name: s.name, rollNo: s.rollNo, percentage: max ? Math.round((scored/max)*100)+"%" : "N/A" };
  }));
  res.json({ success: true, data: results });
});
