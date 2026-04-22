const mongoose = require("mongoose");
const S = new mongoose.Schema({
  classNo:     { type: Number, required: true },
  teacherId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  subject:     { type: String, required: true },
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  dueDate:     { type: Date },
  attachment:  { type: String, default: "" },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });
S.index({ classNo: 1, isActive: 1 });
module.exports = mongoose.model("Homework", S);
