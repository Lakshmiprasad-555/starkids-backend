const ah   = require("../utils/async");
const User = require("../models/User");
const tok  = require("../utils/token");

exports.login = ah(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password required" });

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await user.checkPw(password)))
    return res.status(401).json({ success: false, message: "Invalid email or password" });
  if (!user.isActive)
    return res.status(401).json({ success: false, message: "Account deactivated" });

  User.findByIdAndUpdate(user._id, { lastLogin: new Date() }).exec();

  res.json({ success: true, data: {
    _id: user._id, name: user.name, email: user.email,
    role: user.role, phone: user.phone, profilePhoto: user.profilePhoto,
    token: tok(user._id),
  }});
});

exports.profile = ah(async (req, res) => {
  const u = await User.findById(req.user._id).select("-password").lean();
  res.json({ success: true, data: u });
});

exports.updateFcm = ah(async (req, res) => {
  if (!req.body.fcmToken)
    return res.status(400).json({ success: false, message: "fcmToken required" });
  await User.findByIdAndUpdate(req.user._id, { fcmToken: req.body.fcmToken });
  res.json({ success: true, message: "FCM token updated" });
});

exports.changePw = ah(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ success: false, message: "Both passwords required" });
  if (newPassword.length < 6)
    return res.status(400).json({ success: false, message: "New password must be at least 6 characters" });

  const user = await User.findById(req.user._id);
  if (!(await user.checkPw(oldPassword)))
    return res.status(400).json({ success: false, message: "Old password incorrect" });

  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password changed successfully" });
});

// Principal resets any user's password
exports.resetPw = ah(async (req, res) => {
  const { userId, newPassword } = req.body;
  if (!userId || !newPassword)
    return res.status(400).json({ success: false, message: "userId and newPassword required" });
  if (newPassword.length < 6)
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: "Password reset successfully" });
});
