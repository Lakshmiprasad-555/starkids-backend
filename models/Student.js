const mongoose = require("mongoose");
const S = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  class:        { type: Number, min: 1, max: 7, required: true },
  section:      { type: String, default: "A", uppercase: true },
  rollNo:       { type: String, default: "" },
  admissionNo:  { type: String, unique: true },
  dob:          { type: Date },
  address:      { type: String, default: "" },
  photo:        { type: String, default: "" },
  bloodGroup:   { type: String, default: "" },
  parentId:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  academicYear: { type: String, default: "2025-2026" },
  isActive:     { type: Boolean, default: true },
}, { timestamps: true });
S.index({ class: 1, isActive: 1 });
S.index({ parentId: 1 });
module.exports = mongoose.model("Student", S);
