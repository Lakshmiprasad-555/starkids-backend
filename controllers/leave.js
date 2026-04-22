const ah    = require("../utils/async");
const Leave = require("../models/Leave");
const User  = require("../models/User");
const { push } = require("../utils/notify");

exports.apply = ah(async (req, res) => {
  const l = await Leave.create({ userId: req.user._id, ...req.body });
  User.findOne({ role: "principal" }).select("fcmToken").lean()
    .then(p => push({ token: p?.fcmToken, title: "New Leave Request", body: req.user.name + " applied for leave" }))
    .catch(()=>{});
  res.status(201).json({ success: true, message: "Leave applied", data: l });
});

exports.list = ah(async (req, res) => {
  const f = {};
  if (req.query.status) f.status = req.query.status;
  const data = await Leave.find(f).populate("userId","name role").populate("studentId","name class").sort({ createdAt: -1 }).lean();
  res.json({ success: true, count: data.length, data });
});

exports.update = ah(async (req, res) => {
  const l = await Leave.findByIdAndUpdate(req.params.id, { status: req.body.status, approvedBy: req.user._id }, { new: true }).populate("userId","fcmToken name");
  push({ token: l.userId?.fcmToken, title: "Leave " + (req.body.status === "approved" ? "Approved" : "Rejected"), body: "Your leave has been " + req.body.status }).catch(()=>{});
  res.json({ success: true, data: l });
});

exports.mine = ah(async (req, res) => {
  const data = await Leave.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data });
});
