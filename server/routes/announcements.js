const express = require("express");
const Announcement = require("../models/Announcement");
const { requireAuth } = require("../validators/guards");

const router = express.Router();

/**
 * EMPLOYEE: read announcements
 * GET /api/announcements
 */
router.get("/", requireAuth("employee"), async (req, res) => {
  try {
    const items = await Announcement.find({})
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * OWNER: create announcement
 * POST /api/announcements   body: { title, message }
 */
router.post("/", requireAuth("owner"), async (req, res) => {
  try {
    const { title, message } = req.body || {};
    if (!message) return res.status(400).json({ error: "message is required" });

    const doc = await Announcement.create({
      title: title || "Announcement",
      message: String(message),
      createdBy: req.auth.sub,
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
