const r = require("express").Router();
const c = require("../controllers/fee");
const { protect, role } = require("../middleware/auth");

// ── Fee Structure  ────────────────────────────────────────────────────────────
// Principal sets one annual amount per class
r.post("/structure",                      protect, role("principal"),                  c.setStructure);
r.get("/structure",                       protect, role("principal", "teacher"),       c.getStructure);

// ── Assign fees to all students  ──────────────────────────────────────────────
// Call once at start of academic year — reads structure, creates StudentFee docs
r.post("/assign",                         protect, role("principal"),                  c.assignFees);

// ── Summary & defaulters  ─────────────────────────────────────────────────────
r.get("/summary",                         protect, role("principal"),                  c.summary);
r.get("/defaulters",                      protect, role("principal"),                  c.defaulters);
r.post("/send-reminders",                 protect, role("principal"),                  c.sendReminders);

// ── Class-wise view  ──────────────────────────────────────────────────────────
// IMPORTANT: /class/:classNo must be before /student/:studentId to avoid conflict
r.get("/class/:classNo",                  protect, role("principal", "teacher"),       c.getClassFees);

// ── Per-student fee  ──────────────────────────────────────────────────────────
r.get("/student/:studentId",              protect, role("principal", "teacher"),       c.getStudentFee);
r.put("/student/:studentId/amount",       protect, role("principal"),                  c.updateStudentAmount);
r.post("/student/:studentId/pay",         protect, role("principal"),                  c.recordPayment);
r.delete("/student/:studentId/pay/:paymentId", protect, role("principal"),             c.deletePayment);
r.put("/student/:studentId/waive",        protect, role("principal"),                  c.waiveFee);

// ── Parent view  ──────────────────────────────────────────────────────────────
r.get("/my-fees",                         protect, role("parent"),                     c.myChildFees);

module.exports = r;