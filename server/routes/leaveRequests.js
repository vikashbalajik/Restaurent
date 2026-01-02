const express = require("express");
const LeaveRequest = require("../models/LeaveRequest");
const { requireAuth } = require("../validators/guards");

const router = express.Router();

/**
 * EMPLOYEE: submit leave request
 * POST /api/leave-requests
 */
router.post("/", requireAuth("employee"), async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body || {};
    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ error: "fromDate, toDate and reason are required" });
    }

    const f = new Date(fromDate);
    const t = new Date(toDate);
    if (t < f) return res.status(400).json({ error: "toDate cannot be before fromDate" });

    const doc = await LeaveRequest.create({
      employee: req.auth.sub,
      fromDate: f,
      toDate: t,
      reason: String(reason).trim(),
      status: "Pending",
    });

    res.status(201).json(doc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * EMPLOYEE: list own leave requests
 * GET /api/leave-requests/my
 */
router.get("/my", requireAuth("employee"), async (req, res) => {
  try {
    const items = await LeaveRequest.find({ employee: req.auth.sub })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * OWNER: list leave requests
 * GET /api/leave-requests?status=Pending
 */
router.get("/", requireAuth("owner"), async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const items = await LeaveRequest.find(filter)
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
 * OWNER: approve/reject leave request
 * PATCH /api/leave-requests/:id  body: { status: "Approved"|"Rejected" }
 */
router.patch("/:id", requireAuth("owner"), async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await LeaveRequest.findByIdAndUpdate(
      req.params.id,
      { status, reviewedBy: req.auth.sub, reviewedAt: new Date() },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Leave request not found" });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
