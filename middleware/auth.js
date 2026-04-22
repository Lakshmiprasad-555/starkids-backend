const jwt  = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer"))
    return res.status(401).json({ success: false, message: "No token provided" });
  try {
    const decoded = jwt.verify(auth.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password").lean();
    if (!req.user)          return res.status(401).json({ success: false, message: "User not found" });
    if (!req.user.isActive) return res.status(401).json({ success: false, message: "Account deactivated" });
    next();
  } catch {
    res.status(401).json({ success: false, message: "Token invalid or expired" });
  }
};

const role = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, message: "Access denied for role: " + req.user?.role });
  next();
};

module.exports = { protect, role };
