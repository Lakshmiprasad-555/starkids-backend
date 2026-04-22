const mongoose = require("mongoose");
const S = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
  date:      { type: Date, required: true },
  status:    { type: String, enum: ["present", "absent", "late", "halfday"], required: true },
  markedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  remarks:   { type: String, default: "" },
}, { timestamps: true });
S.index({ teacherId: 1, date: 1 }, { unique: true });
S.index({ date: 1 });
module.exports = mongoose.model("TeacherAttendance", S);
