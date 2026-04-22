const mongoose = require("mongoose");
const S = new mongoose.Schema({
  busNo:       { type: String, required: true, unique: true },
  route:       { type: String, required: true },
  driverName:  { type: String, required: true },
  driverPhone: { type: String, required: true },
  capacity:    { type: Number, default: 40 },
  students:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Student" }],
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });
module.exports = mongoose.model("Transport", S);
