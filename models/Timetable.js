const mongoose = require("mongoose");
const S = new mongoose.Schema({
  classNo:   { type: Number, required: true },
  day:       { type: String, enum: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], required: true },
  subject:   { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  startTime: { type: String, required: true },
  endTime:   { type: String, required: true },
}, { timestamps: true });
S.index({ classNo: 1, day: 1 });
module.exports = mongoose.model("Timetable", S);
