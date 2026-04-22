const mongoose = require("mongoose");
const S = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  eventDate:   { type: Date,   required: true },
  type:        { type: String, default: "general" },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  isHoliday:   { type: Boolean, default: false },
}, { timestamps: true });
S.index({ eventDate: 1 });
module.exports = mongoose.model("Event", S);
