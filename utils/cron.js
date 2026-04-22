const cron    = require("node-cron");
const { FeeStructure, FeeRecord } = require("../models/Fee");
const Student = require("../models/Student");
const { pushMany } = require("./notify");

// 1st of every month 8AM IST
const monthlyFee = cron.schedule("0 8 1 * *", async () => {
  console.log("CRON: monthly fee generation...");
  try {
    const now   = new Date();
    const label = now.toLocaleString("default", { month: "long", year: "numeric" });

    const [students, structs] = await Promise.all([
      Student.find({ isActive: true }).lean(),
      FeeStructure.find({ frequency: "monthly" }).lean(),
    ]);

    // FIX: batch query — one DB call instead of N×M
    const existing = await FeeRecord.find({ month: label }).select("studentId feeType").lean();
    const existSet = new Set(existing.map(e => e.studentId.toString() + "_" + e.feeType));

    const docs = [];
    for (const s of students) {
      for (const f of structs.filter(x => x.classNo === s.class)) {
        const key = s._id.toString() + "_" + f.feeType;
        if (!existSet.has(key)) {
          docs.push({ studentId: s._id, feeType: f.feeType, amount: f.amount, dueDate: now, month: label });
        }
      }
    }
    if (docs.length) await FeeRecord.insertMany(docs);
    console.log("CRON: generated", docs.length, "fee records for", label);
  } catch (e) { console.error("CRON fee error:", e.message); }
}, { timezone: "Asia/Kolkata" });

// Every day 7PM IST — remind defaulters
const feeReminder = cron.schedule("0 19 * * *", async () => {
  console.log("CRON: fee reminders...");
  try {
    const pending = await FeeRecord.find({ status: "pending", dueDate: { $lt: new Date() } })
      .populate({ path: "studentId", populate: { path: "parentId", select: "fcmToken" } }).lean();
    const tokens = [...new Set(pending.map(f => f.studentId?.parentId?.fcmToken).filter(Boolean))];
    if (tokens.length) await pushMany({ tokens, title: "Fee Overdue — Star Kids", body: "Pending fee due. Please pay at school." });
    console.log("CRON: reminders sent to", tokens.length, "parents");
  } catch (e) { console.error("CRON remind error:", e.message); }
}, { timezone: "Asia/Kolkata" });

const startCron = () => {
  monthlyFee.start();
  feeReminder.start();
  console.log("Cron jobs running (IST)");
};
module.exports = { startCron };
