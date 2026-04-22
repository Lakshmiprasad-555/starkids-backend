const ah = require("../utils/async");
const Tr = require("../models/Transport");

exports.add    = ah(async (req, res) => { const d = await Tr.create(req.body); res.status(201).json({ success: true, data: d }); });
exports.list   = ah(async (req, res) => { const d = await Tr.find({ isActive:true }).populate("students","name class").lean(); res.json({ success:true, data:d }); });
exports.assign = ah(async (req, res) => { const d = await Tr.findByIdAndUpdate(req.params.id, { $addToSet:{ students: req.body.studentId } }, { new:true }); res.json({ success:true, data:d }); });
