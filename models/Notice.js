const mongoose = require("mongoose");
const S = new mongoose.Schema({
  title:     { type: String, required: true },
  message:   { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  target:    { type: String, enum: ["all","teachers","parents"], default: "all" },
  isUrgent:  { type: Boolean, default: false },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });
S.index({ target: 1, isActive: 1, createdAt: -1 });
module.exports = mongoose.model("Notice", S);
