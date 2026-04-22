const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const S = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 6 },
  role:         { type: String, enum: ["principal","teacher","parent"], required: true },
  phone:        { type: String, default: "" },
  profilePhoto: { type: String, default: "" },
  fcmToken:     { type: String, default: "" },
  isActive:     { type: Boolean, default: true },
  lastLogin:    { type: Date },
}, { timestamps: true });

S.index({ email: 1 });
S.index({ role: 1, isActive: 1 });

S.pre("save", async function(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, await bcrypt.genSalt(10));
  next();
});
S.methods.checkPw = async function(pw) { return bcrypt.compare(pw, this.password); };

module.exports = mongoose.models.User || mongoose.model("User", S);
