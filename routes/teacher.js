const express = require("express");
const router  = express.Router();
const Teacher = require("../models/Teacher");
const User    = require("../models/User");
const { protect, role } = require("../middleware/auth");
const ctrl    = require("../controllers/teacher"); // ← ADD THIS

// ✅ GET all teachers
router.get("/", async (req, res) => {
  try {
    console.log("🔥 Teachers API HIT");
    const teachers = await Teacher.find()
      .populate("userId", "name email");
    res.json({ success: true, data: teachers });
  } catch (err) {
    console.error("❌ Error fetching teachers:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ ADD new teacher
router.post("/", protect, role("principal"), async (req, res) => {
  try {
    const { name, email, phone, subject, assignedClass, qualification } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const user = await User.create({
      name, email, phone,
      password: "Teacher@123",
      role: "teacher",
    });

    const teacher = await Teacher.create({
      userId: user._id,
      subject, assignedClass, qualification,
    });

    res.json({ success: true, data: teacher, message: "Teacher added successfully" });

  } catch (err) {
    console.error("Error adding teacher:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ EDIT teacher
router.put("/:id", protect, role("principal"), ctrl.update);

// ✅ TOGGLE attendance permission
router.patch("/:id/permission", protect, role("principal"), ctrl.toggleAttendancePermission);

module.exports = router;