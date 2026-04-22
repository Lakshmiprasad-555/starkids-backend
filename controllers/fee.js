const ah = require("../utils/async");
const { FeeStructure, StudentFee } = require("../models/Fee");
const Student = require("../models/Student");
const { pushMany } = require("../utils/notify");
const { sendEmail, tpl } = require("../utils/email");

const CURRENT_YEAR = "2025-2026";

// ═════════════════════════════════════════════════════════════════════════════
//  FEE STRUCTURE  (principal sets one annual amount per class)
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/fees/structure
// Body: { classNo, annualAmount, academicYear? }
// Sets (or updates) the annual fee for an entire class.
exports.setStructure = ah(async (req, res) => {
  const { classNo, annualAmount, academicYear } = req.body;
  if (!classNo || annualAmount == null)
    return res.status(400).json({ success: false, message: "classNo and annualAmount are required" });

  const doc = await FeeStructure.findOneAndUpdate(
    { classNo: Number(classNo) },
    { annualAmount: Number(annualAmount), academicYear: academicYear || CURRENT_YEAR },
    { upsert: true, new: true }
  );
  res.json({ success: true, message: `Fee structure saved for Class ${classNo}`, data: doc });
});

// GET /api/fees/structure
// Returns all class fee structures (principal + teacher can view)
exports.getStructure = ah(async (req, res) => {
  const data = await FeeStructure.find().sort({ classNo: 1 }).lean();
  res.json({ success: true, data });
});

// ═════════════════════════════════════════════════════════════════════════════
//  ASSIGN FEES TO STUDENTS
//  Call this once per academic year after setting the fee structure.
//  Creates a StudentFee record for every active student based on their class.
//  Safe to call multiple times — skips students who already have a record.
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/fees/assign
// Body: { academicYear? }
exports.assignFees = ah(async (req, res) => {
  const academicYear = req.body.academicYear || CURRENT_YEAR;

  const [students, structures] = await Promise.all([
    Student.find({ isActive: true }).lean(),
    FeeStructure.find().lean(),
  ]);

  // ── DEBUG: log what we got ──────────────────────────────────────
  console.log("=== ASSIGN FEES DEBUG ===");
  console.log("Academic year:", academicYear);
  console.log("Total active students found:", students.length);
  console.log("Fee structures found:", structures.length);
  console.log("Structures:", JSON.stringify(structures.map(s => ({ classNo: s.classNo, type: typeof s.classNo, amount: s.annualAmount }))));
  if (students.length > 0) {
    console.log("Sample student class field:", students[0].class, "| type:", typeof students[0].class);
  }
  // ────────────────────────────────────────────────────────────────

  const structMap = {};
  // ✅ CHANGE TO — only store if amount is valid
  structures.forEach(s => {
    if (s.annualAmount > 0) {
      structMap[s.classNo] = s.annualAmount;
    }
  });

  const existing = await StudentFee.find({ academicYear }).select("studentId").lean();
  const existSet = new Set(existing.map(e => e.studentId.toString()));
  console.log("Already assigned (existing records):", existing.length);

  const docs = [];
  const skipped = [];
  const skipReasons = { alreadyExists: 0, noStructure: 0 };  // DEBUG

  for (const s of students) {
    if (existSet.has(s._id.toString())) {
      skipped.push(s._id);
      skipReasons.alreadyExists++;
      continue;
    }
    const annualAmount = structMap[Number(s.class)];
    if (!annualAmount) {
      console.log(`  SKIPPED student ${s.name} | class="${s.class}" (type: ${typeof s.class}) | structMap keys:`, Object.keys(structMap));
      skipped.push(s._id);
      skipReasons.noStructure++;
      continue;
    }
    docs.push({
      studentId:    s._id,
      academicYear,
      annualAmount,
      amountPaid:   0,
      balance:      annualAmount,
      status:       "unpaid",
      payments:     [],
    });
  }

  console.log("Skip reasons:", skipReasons);
  console.log("Docs to insert:", docs.length);
  console.log("=========================");

  if (docs.length) await StudentFee.insertMany(docs);
  res.json({
    success:  true,
    message:  `${docs.length} students assigned fees for ${academicYear}`,
    assigned: docs.length,
    skipped:  skipped.length,
    // DEBUG — remove after fixing:
    debug: { skipReasons, structMapKeys: Object.keys(structMap), sampleStudentClass: students[0]?.class }
  });
});
// ═════════════════════════════════════════════════════════════════════════════
//  EDIT STUDENT'S ANNUAL AMOUNT  (override for individual student)
//  Used when a poor family gets a reduced fee.
//  Only changes annualAmount — does NOT touch existing payments.
// ═════════════════════════════════════════════════════════════════════════════

// PUT /api/fees/student/:studentId/amount
// Body: { annualAmount, academicYear?, note? }
exports.updateStudentAmount = ah(async (req, res) => {
  const { annualAmount, academicYear, note } = req.body;
  if (annualAmount == null || Number(annualAmount) < 0)
    return res.status(400).json({ success: false, message: "annualAmount is required and must be >= 0" });

  const fee = await StudentFee.findOne({
    studentId:    req.params.studentId,
    academicYear: academicYear || CURRENT_YEAR,
  });
  if (!fee)
    return res.status(404).json({ success: false, message: "Fee record not found for this student. Assign fees first." });

  fee.annualAmount = Number(annualAmount);
  if (note) fee.waiverNote = note;
  await fee.save(); // pre-save hook recomputes balance and status

  res.json({ success: true, message: "Student annual fee updated", data: fee });
});

// ═════════════════════════════════════════════════════════════════════════════
//  RECORD A PAYMENT  (principal only — no online payment)
//  Adds one entry to the payments[] ledger.
//  Pre-save hook recomputes amountPaid, balance, and status automatically.
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/fees/student/:studentId/pay
// Body: { amount, note?, date?, academicYear? }
exports.recordPayment = ah(async (req, res) => {
  const { amount, note, date, academicYear } = req.body;
  if (!amount || Number(amount) <= 0)
    return res.status(400).json({ success: false, message: "amount is required and must be > 0" });

  const fee = await StudentFee.findOne({
    studentId:    req.params.studentId,
    academicYear: academicYear || CURRENT_YEAR,
  });
  if (!fee)
    return res.status(404).json({ success: false, message: "Fee record not found for this student" });

  if (fee.waived)
    return res.status(400).json({ success: false, message: "This fee has been waived. Cannot record payment." });

  if (fee.balance <= 0)
    return res.status(400).json({ success: false, message: "Fee is already fully paid" });

  const payAmount = Math.min(Number(amount), fee.balance); // never overpay

  fee.payments.push({
    amount:     payAmount,
    date:       date ? new Date(date) : new Date(),
    note:       note || "",
    recordedBy: req.user._id,
  });

  await fee.save(); // pre-save hook handles amountPaid, balance, status

  res.json({
    success:  true,
    message:  `Payment of Rs. ${payAmount} recorded`,
    balance:  fee.balance,
    status:   fee.status,
    data:     fee,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  DELETE A PAYMENT ENTRY  (correction — if principal made a mistake)
// ═════════════════════════════════════════════════════════════════════════════

// DELETE /api/fees/student/:studentId/pay/:paymentId
exports.deletePayment = ah(async (req, res) => {
  const fee = await StudentFee.findOne({
    studentId: req.params.studentId,
    academicYear: CURRENT_YEAR,
  });
  if (!fee) return res.status(404).json({ success: false, message: "Fee record not found" });

  const entry = fee.payments.id(req.params.paymentId);
  if (!entry) return res.status(404).json({ success: false, message: "Payment entry not found" });

  entry.deleteOne();
  await fee.save(); // recomputes balance

  res.json({ success: true, message: "Payment entry removed", data: fee });
});

// ═════════════════════════════════════════════════════════════════════════════
//  WAIVE FEE  (principal marks student as exempted)
// ═════════════════════════════════════════════════════════════════════════════

// PUT /api/fees/student/:studentId/waive
// Body: { note?, academicYear? }
exports.waiveFee = ah(async (req, res) => {
  const fee = await StudentFee.findOne({
    studentId:    req.params.studentId,
    academicYear: req.body.academicYear || CURRENT_YEAR,
  });
  if (!fee) return res.status(404).json({ success: false, message: "Fee record not found" });

  fee.waived     = true;
  fee.waiverNote = req.body.note || "Waived by principal";
  await fee.save();

  res.json({ success: true, message: "Fee waived", data: fee });
});

// ═════════════════════════════════════════════════════════════════════════════
//  GET ONE STUDENT'S FEE DETAIL  (principal + teacher)
//  Returns full ledger: annualAmount, amountPaid, balance, all payments[]
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/fees/student/:studentId
exports.getStudentFee = ah(async (req, res) => {
  const academicYear = req.query.year || CURRENT_YEAR;
  const fee = await StudentFee.findOne({ studentId: req.params.studentId, academicYear })
    .populate("payments.recordedBy", "name")
    .lean();

  if (!fee)
    return res.status(404).json({ success: false, message: "No fee record found for this student" });

  res.json({ success: true, data: fee });
});

// ═════════════════════════════════════════════════════════════════════════════
//  GET ALL STUDENTS IN A CLASS  (principal + teacher)
//  Returns summary per student: annualAmount, amountPaid, balance, status
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/fees/class/:classNo
exports.getClassFees = ah(async (req, res) => {
  const classNo      = Number(req.params.classNo);
  const academicYear = req.query.year || CURRENT_YEAR;

  const students = await Student.find({ class: classNo, isActive: true })
    .select("_id name admissionNo class")
    .lean();

  if (!students.length)
    return res.json({ success: true, data: [] });

  const studentIds = students.map(s => s._id);
  const fees = await StudentFee.find({ studentId: { $in: studentIds }, academicYear })
    .select("studentId annualAmount amountPaid balance status waived")
    .lean();

  const feeMap = {};
  fees.forEach(f => { feeMap[f.studentId.toString()] = f; });

  const data = students.map(s => {
    const f = feeMap[s._id.toString()];
    return {
      student:      s,
      annualAmount: f?.annualAmount ?? null,
      amountPaid:   f?.amountPaid  ?? 0,
      balance:      f?.balance     ?? null,
      status:       f?.status      ?? "not_assigned",
      waived:       f?.waived      ?? false,
      feeId:        f?._id         ?? null,
    };
  });

  res.json({ success: true, data });
});

// ═════════════════════════════════════════════════════════════════════════════
//  SUMMARY  (principal dashboard)
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/fees/summary
exports.summary = ah(async (req, res) => {
  const academicYear = req.query.year || CURRENT_YEAR;
  const fees = await StudentFee.find({ academicYear }).lean();

  const totalAnnual    = fees.reduce((s, f) => s + f.annualAmount, 0);
  const totalCollected = fees.reduce((s, f) => s + f.amountPaid, 0);
  const totalPending   = fees.reduce((s, f) => s + f.balance, 0);
  const totalWaived    = fees.filter(f => f.waived).length;

  const byStatus = { unpaid: 0, partial: 0, paid: 0, waived: 0 };
  fees.forEach(f => { byStatus[f.status] = (byStatus[f.status] || 0) + 1; });

  res.json({
    success: true,
    data: {
      totalAnnual,
      totalCollected,
      totalPending,
      totalWaived,
      studentCount: fees.length,
      byStatus,
    },
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  DEFAULTERS  (students with balance > 0, principal only)
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/fees/defaulters
exports.defaulters = ah(async (req, res) => {
  const academicYear = req.query.year || CURRENT_YEAR;
  const fees = await StudentFee.find({
    academicYear,
    status: { $in: ["unpaid", "partial"] },
  })
    .populate({
      path: "studentId",
      select: "name class admissionNo",
      populate: { path: "parentId", select: "name phone email" },
    })
    .sort({ balance: -1 })
    .lean();

  res.json({ success: true, count: fees.length, data: fees });
});

// ═════════════════════════════════════════════════════════════════════════════
//  SEND REMINDERS  (principal only)
// ═════════════════════════════════════════════════════════════════════════════

// POST /api/fees/send-reminders
exports.sendReminders = ah(async (req, res) => {
  const academicYear = req.body.academicYear || CURRENT_YEAR;
  const pending = await StudentFee.find({
    academicYear,
    status: { $in: ["unpaid", "partial"] },
  })
    .populate({
      path: "studentId",
      populate: { path: "parentId", select: "fcmToken email name" },
    })
    .lean();

  const tokens = [];
  const emails = [];
  pending.forEach(f => {
    const parent = f.studentId?.parentId;
    if (parent?.fcmToken) tokens.push(parent.fcmToken);
    if (parent?.email)
      emails.push({ parent, student: f.studentId, fee: f });
  });

  await Promise.all([
    tokens.length
      ? pushMany({
          tokens,
          title: "Fee Reminder — Star Kids School",
          body:  "School fee is pending. Please pay at school.",
        })
      : Promise.resolve(),
    ...emails.map(({ parent, student, fee }) =>
      sendEmail({
        to: parent.email,
        ...tpl.feeReminder(parent.name, student.name, fee.balance, academicYear),
      }).catch(() => {})
    ),
  ]);

  res.json({ success: true, message: `Reminders sent to ${tokens.length} parents` });
});

// ═════════════════════════════════════════════════════════════════════════════
//  PARENT — VIEW OWN CHILD'S FEE  (view only, no payment)
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/fees/my-fees
exports.myChildFees = ah(async (req, res) => {
  const academicYear = req.query.year || CURRENT_YEAR;
  const children = await Student.find({ parentId: req.user._id, isActive: true })
    .select("_id name class admissionNo")
    .lean();

  if (!children.length)
    return res.json({ success: true, data: [] });

  const studentIds = children.map(c => c._id);
  const fees = await StudentFee.find({ studentId: { $in: studentIds }, academicYear })
    .populate("payments.recordedBy", "name")
    .lean();

  const feeMap = {};
  fees.forEach(f => { feeMap[f.studentId.toString()] = f; });

  const data = children.map(c => ({
    student:      c,
    fee:          feeMap[c._id.toString()] || null,
  }));

  res.json({ success: true, data });
});