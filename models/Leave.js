const mongoose = require("mongoose");
const S = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type:       { type: String, enum: ["teacher_leave","student_leave"], required: true },
  studentId:  { type: mongoose.Schema.Types.ObjectId, ref: "Student" },
  fromDate:   { type: Date, required: true },
  toDate:     { type: Date, required: true },
  reason:     { type: String, required: true },
  status:     { type: String, enum: ["pending","approved","rejected"], default: "pending" },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });
S.index({ status: 1, createdAt: -1 });
module.exports = mongoose.model("Leave", S);
