const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const { requireAuth } = require("../validators/guards");

const router = express.Router();

/**
 * EMPLOYEE: send message
 * POST /api/messages   body: { receiverId, message }
 */
router.post("/", requireAuth("employee"), async (req, res) => {
  try {
    const { receiverId, message } = req.body || {};
    if (!receiverId || !message) {
      return res.status(400).json({ error: "receiverId and message are required" });
    }

    const doc = await Message.create({
      sender: req.auth.sub,
      receiver: receiverId,
      message: String(message),
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * EMPLOYEE: get messages with another employee
 * GET /api/messages/:userId
 */
router.get("/:userId", requireAuth("employee"), async (req, res) => {
  try {
    const otherId = req.params.userId;
    if (!mongoose.isValidObjectId(otherId)) {
      return res.status(400).json({ error: "Invalid userId" });
    }

    const myId = req.auth.sub;
    const items = await Message.find({
      $or: [
        { sender: myId, receiver: otherId },
        { sender: otherId, receiver: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
