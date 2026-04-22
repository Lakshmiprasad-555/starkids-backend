const mongoose = require("mongoose");
const S = new mongoose.Schema({
  title:      { type: String, required: true },
  photoUrl:   { type: String, required: true },
  eventId:    { type: mongoose.Schema.Types.ObjectId, ref: "Event" },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  classNo:    { type: Number },
}, { timestamps: true });
S.index({ createdAt: -1 });
module.exports = mongoose.model("Gallery", S);
