// models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message:    { type: String, required: true },
  isRead:     { type: Boolean, default: false },
  expiresAt:  { type: Date, default: () => new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
}, { timestamps: true });

// MongoDB will auto-delete documents when expiresAt is reached
messageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Message", messageSchema);