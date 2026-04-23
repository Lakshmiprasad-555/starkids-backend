// controllers/message.js
const ah      = require("../utils/async");
const Message = require("../models/Message");
const User    = require("../models/User");
const { push } = require("../utils/notify");

// ✅ Anyone can send to anyone (one-to-one)
exports.send = ah(async (req, res) => {
  const { receiverId, message } = req.body;

  if (!receiverId || !message) {
    return res.status(400).json({ success: false, message: "receiverId and message are required" });
  }

  // Prevent messaging yourself
  if (receiverId === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: "Cannot send message to yourself" });
  }

  const receiver = await User.findById(receiverId).select("name fcmToken").lean();
  if (!receiver) {
    return res.status(404).json({ success: false, message: "Recipient not found" });
  }

  const msg = await Message.create({
    senderId:   req.user._id,
    receiverId: receiverId,
    message:    message,
    // expiresAt is set automatically by model default (2 days)
  });

  // Fire-and-forget push notification
  push({
    token: receiver.fcmToken,
    title: "Message from " + req.user.name,
    body:  message.slice(0, 80),
  }).catch(() => {});

  res.status(201).json({ success: true, data: msg });
});

// ✅ Get conversation thread between current user and another user
exports.thread = ah(async (req, res) => {
  const otherId = req.params.uid;

  const [msgs] = await Promise.all([
    Message.find({
      $or: [
        { senderId: req.user._id, receiverId: otherId },
        { senderId: otherId,      receiverId: req.user._id },
      ],
    })
      .sort({ createdAt: 1 })
      .lean(),

    // Mark messages from the other person as read
    Message.updateMany(
      { senderId: otherId, receiverId: req.user._id, isRead: false },
      { isRead: true }
    ),
  ]);

  res.json({ success: true, count: msgs.length, data: msgs });
});

// ✅ Contacts — everyone sees everyone except themselves
exports.contacts = ah(async (req, res) => {
  const myId   = req.user._id;
  const myRole = req.user.role;

  let filter = { _id: { $ne: myId }, isActive: true };

  if (myRole === "parent") {
    filter.role = { $in: ["principal", "teacher"] };
  }

  const users = await User.find(filter)
    .select("name role profilePhoto")
    .lean();

  res.json({ success: true, data: users });
});