const mongoose = require("mongoose");
const S = new mongoose.Schema({
  studentId:    { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  examType:     { type: String, enum: ["unit_test","midterm","final"], required: true },
  subject:      { type: String, required: true },
  maxMarks:     { type: Number, required: true },
  scored:       { type: Number, required: true },
  grade:        { type: String, default: "" },
  percentage:   { type: Number, default: 0 },
  remarks:      { type: String, default: "" },
  academicYear: { type: String, default: "2025-2026" },
}, { timestamps: true });
S.index({ studentId: 1, examType: 1 });
S.pre("save", function(next) {
  this.percentage = Math.round((this.scored / this.maxMarks) * 100);
  if      (this.percentage >= 90) this.grade = "A+";
  else if (this.percentage >= 80) this.grade = "A";
  else if (this.percentage >= 70) this.grade = "B";
  else if (this.percentage >= 60) this.grade = "C";
  else if (this.percentage >= 50) this.grade = "D";
  else                            this.grade = "F";
  next();
});
module.exports = mongoose.model("ExamMark", S);
