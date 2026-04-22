const ah     = require("../utils/async");
const Notice = require("../models/Notice");
const User   = require("../models/User");
const { pushMany } = require("../utils/notify");

exports.create = ah(async (req, res) => {
  const { title, message, target, isUrgent } = req.body;
  const n = await Notice.create({ title, message, target, isUrgent, createdBy: req.user._id });

  const rFilter = target === "teachers" ? { role: "teacher" } : target === "parents" ? { role: "parent" } : { role: { $in: ["teacher","parent"] } };
  User.find(rFilter).select("fcmToken").lean()
    .then(us => pushMany({ tokens: us.map(u => u.fcmToken), title, body: message }))
    .catch(()=>{});

  res.status(201).json({ success: true, message: "Notice created", data: n });
});

exports.list = ah(async (req, res) => {
  const f = { isActive: true };
  if (req.query.target) f.target = { $in: [req.query.target, "all"] };
  const data = await Notice.find(f).populate("createdBy","name").sort({ createdAt: -1 }).lean();
  res.json({ success: true, count: data.length, data });
});

exports.remove = ah(async (req, res) => {
  await Notice.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: "Notice deleted" });
});
