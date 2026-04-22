// ============================================================
//   STAR KIDS CONNECT — Seeder
//   npm run seed          → creates principal + fee structure
//   npm run seed:destroy  → wipes all data
// ============================================================
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const User     = require("../models/User");
const { FeeStructure } = require("../models/Fee");

const connect = () => mongoose.connect(process.env.MONGO_URI, { maxPoolSize: 2 });

const DEFAULT_FEES = [
  ...[1,2].flatMap(c => [
    { classNo:c, feeType:"Tuition Fee", amount:1500, frequency:"monthly" },
    { classNo:c, feeType:"Exam Fee",    amount:400,  frequency:"yearly"  },
    { classNo:c, feeType:"Sports Fee",  amount:300,  frequency:"yearly"  },
  ]),
  ...[3,4].flatMap(c => [
    { classNo:c, feeType:"Tuition Fee", amount:1800, frequency:"monthly" },
    { classNo:c, feeType:"Exam Fee",    amount:400,  frequency:"yearly"  },
    { classNo:c, feeType:"Sports Fee",  amount:300,  frequency:"yearly"  },
  ]),
  ...[5,6,7].flatMap(c => [
    { classNo:c, feeType:"Tuition Fee", amount:2000, frequency:"monthly" },
    { classNo:c, feeType:"Lab Fee",     amount:200,  frequency:"monthly" },
    { classNo:c, feeType:"Exam Fee",    amount:500,  frequency:"yearly"  },
    { classNo:c, feeType:"Sports Fee",  amount:300,  frequency:"yearly"  },
  ]),
];

async function seed() {
  await connect();
  const exists = await User.findOne({ role: "principal" });
  if (exists) {
    console.log("Principal already exists:", exists.email);
    console.log("Run seed:destroy first to reset.");
    return process.exit(0);
  }

  const principal = await User.create({
    name:     process.env.PRINCIPAL_NAME     || "Principal",
    email:    process.env.PRINCIPAL_EMAIL    || "principal@starkids.com",
    password: process.env.PRINCIPAL_PASSWORD || "Admin@123",
    phone:    process.env.PRINCIPAL_PHONE    || "",
    role:     "principal",
    isActive: true,
  });

  for (const f of DEFAULT_FEES)
    await FeeStructure.findOneAndUpdate({ classNo: f.classNo, feeType: f.feeType }, f, { upsert: true });

  console.log("\n================================================");
  console.log("  Star Kids Connect — Setup Complete!");
  console.log("  School:", process.env.SCHOOL_NAME);
  console.log("  Principal created:", principal.email);
  console.log("  Password:", process.env.PRINCIPAL_PASSWORD || "Admin@123");
  console.log("  Fee structure created for Classes 1-7");
  console.log("================================================\n");
  console.log("  IMPORTANT: Change password after first login!");
  process.exit(0);
}

async function destroy() {
  await connect();
  const models = ["User","Student","Teacher","Attendance","Homework","ExamMark","Notice","Timetable","Message","Leave","Event","Gallery","Transport"];
  for (const m of models) await require("../models/" + m).deleteMany({});
  const { FeeRecord } = require("../models/Fee");
  await Promise.all([FeeStructure.deleteMany({}), FeeRecord.deleteMany({})]);
  console.log("All data destroyed.");
  process.exit(0);
}

process.argv[2] === "--destroy" ? destroy() : seed();
