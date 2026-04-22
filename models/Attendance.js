const mongoose = require("mongoose");
const S = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  classNo:   { type: Number, required: true },
  date:      { type: Date,   required: true },
  status:    { type: String, enum: ["present","absent","late"], required: true },
  markedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  remarks:   { type: String, default: "" },
}, { timestamps: true });
S.index({ studentId: 1, date: 1 }, { unique: true });
S.index({ classNo: 1, date: 1 });
module.exports = mongoose.model("Attendance", S);
