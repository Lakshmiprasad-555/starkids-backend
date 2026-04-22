const ah    = require("../utils/async");
const Event = require("../models/Event");
const User  = require("../models/User");
const { pushMany } = require("../utils/notify");

exports.create = ah(async (req, res) => {
  const e = await Event.create({ ...req.body, createdBy: req.user._id });
  User.find({ role: { $in: ["teacher","parent"] } }).select("fcmToken").lean()
    .then(us => pushMany({ tokens: us.map(u=>u.fcmToken), title: "Event: " + e.title, body: new Date(e.eventDate).toDateString() }))
    .catch(()=>{});
  res.status(201).json({ success: true, data: e });
});

exports.list = ah(async (req, res) => {
  const data = await Event.find().sort({ eventDate: 1 }).lean();
  res.json({ success: true, data });
});

exports.remove = ah(async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Event deleted" });
});
