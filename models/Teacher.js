const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  subject:       { type: String, default: "" },
  assignedClass: { type: Number, min: 1, max: 7 },
  qualification: { type: String, default: "" },
  joiningDate:   { type: Date },
  employeeId:    { type: String, sparse: true },
  canMarkTeacherAttendance: { type: Boolean, default: false }, // ← this was missing too
}, { timestamps: true });

teacherSchema.index({ assignedClass: 1 });

module.exports = mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);