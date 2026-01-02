const express = require("express");
const Shift = require("../models/Shift");
const { requireAuth } = require("../validators/guards");

const router = express.Router();

/**
 * EMPLOYEE: view available shifts
 * GET /api/shifts/available
 */
router.get("/available", requireAuth("employee"), async (req, res) => {
  try {
    const items = await Shift.find({ assignedTo: null })
      .sort({ date: 1 })
      .lean();
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * EMPLOYEE: view my shifts
 * GET /api/shifts/my
 */
router.get("/my", requireAuth("employee"), async (req, res) => {
  try {
    const items = await Shift.find({ assignedTo: req.auth.sub })
      .sort({ date: 1 })
      .lean();
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * EMPLOYEE: pick a shift
 * PATCH /api/shifts/:id/pick
 *
 * Uses atomic update: only picks if assignedTo is still null.
 */
router.patch("/:id/pick", requireAuth("employee"), async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Shift.findOneAndUpdate(
      { _id: id, assignedTo: null },
      { assignedTo: req.auth.sub, assignedAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(409).json({ error: "Shift already taken or not found" });
    }

    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * OWNER: create shift (optional but useful)
 * POST /api/shifts   body: { date, startTime, endTime, role }
 */
router.post("/", requireAuth("owner"), async (req, res) => {
  try {
    const { date, startTime, endTime, role } = req.body || {};
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ error: "date, startTime, endTime are required" });
    }

    const doc = await Shift.create({
      date: new Date(date),
      startTime: String(startTime),
      endTime: String(endTime),
      role: role || "",
      assignedTo: null,
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
