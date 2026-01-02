const express = require("express");
const Timesheet = require("../models/Timesheet");
const { requireAuth } = require("../validators/guards");

const router = express.Router();

/**
 * EMPLOYEE: submit timesheet
 * POST /api/timesheets
 */
router.post("/", requireAuth("employee"), async (req, res) => {
  try {
    const { date, hoursWorked, notes } = req.body || {};
    if (!date || !hoursWorked) return res.status(400).json({ error: "date and hoursWorked are required" });

    const h = Number(hoursWorked);
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      return res.status(400).json({ error: "hoursWorked must be between 0 and 24" });
    }

    const doc = await Timesheet.create({
      employee: req.auth.sub,
      date: new Date(date),
      hoursWorked: h,
      notes: notes || "",
      status: "Pending",
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * EMPLOYEE: list own timesheets
 * GET /api/timesheets/my
 */
router.get("/my", requireAuth("employee"), async (req, res) => {
  try {
    const items = await Timesheet.find({ employee: req.auth.sub })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * OWNER: list all timesheets (optional filters)
 * GET /api/timesheets?status=Pending
 */
router.get("/", requireAuth("owner"), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const items = await Timesheet.find(filter)
      .populate("employee", "name employeeId role section email mobile")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * OWNER: approve/reject timesheet
 * PATCH /api/timesheets/:id   body: { status: "Approved"|"Rejected" }
 */
router.patch("/:id", requireAuth("owner"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await Timesheet.findByIdAndUpdate(
      id,
      { status, reviewedBy: req.auth.sub, reviewedAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Timesheet not found" });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
