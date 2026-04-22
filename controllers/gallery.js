const ah      = require("../utils/async");
const Gallery = require("../models/Gallery");
const { uploadFile } = require("../utils/upload");

exports.upload = ah(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
  const url  = await uploadFile(req.file.buffer, req.file.originalname, "gallery");
  const data = await Gallery.create({ ...req.body, photoUrl: url, uploadedBy: req.user._id });
  res.status(201).json({ success: true, data });
});

exports.list = ah(async (req, res) => {
  const f = {};
  if (req.query.class) f.classNo = Number(req.query.class);
  const data = await Gallery.find(f).populate("uploadedBy","name").sort({ createdAt:-1 }).lean();
  res.json({ success: true, count: data.length, data });
});

exports.remove = ah(async (req, res) => {
  await Gallery.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: "Photo deleted" });
});
