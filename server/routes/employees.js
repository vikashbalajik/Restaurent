// routes/employees.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Employee = require("../models/Employee");
const { registerEmployeeSchema, employeeLoginSchema } = require("../validators/employeeSchemas");
const { requireAuth } = require("../validators/guards");

const router = express.Router();

/**
 * POST /api/employees/register
 */
router.post("/register", async (req, res) => {
  try {
    const parsed = registerEmployeeSchema.parse(req.body);

    // check unique constraints early for better error messages
    const dup = await Employee.findOne({
      $or: [
        { employeeId: parsed.employeeId },
        { email: parsed.email.toLowerCase() },
        { aadharNo: parsed.aadharNo },
      ],
    }).lean();

    if (dup) {
      return res.status(409).json({
        error: "Duplicate field",
        fields: {
          employeeId: dup.employeeId === parsed.employeeId ? parsed.employeeId : undefined,
          email: dup.email === parsed.email.toLowerCase() ? parsed.email : undefined,
          aadharNo: dup.aadharNo === parsed.aadharNo ? parsed.aadharNo : undefined,
        },
      });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);

    const doc = await Employee.create({
      employeeId: parsed.employeeId,
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash,
      mobile: parsed.mobile,
      address: parsed.address,
      date: new Date(parsed.date),
      aadharNo: parsed.aadharNo,
      section: parsed.section,
      role: parsed.role,
      duties: parsed.duties || "",
      status: parsed.status || "Pending",
    });

    res.status(201).json({
      message: "Registered",
      employee: {
        _id: doc._id,
        employeeId: doc.employeeId,
        name: doc.name,
        email: doc.email,
        mobile: doc.mobile,
        role: doc.role,
        section: doc.section,
        status: doc.status,
      },
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    if (err?.code === 11000) {
      return res.status(409).json({ error: "Duplicate field", fields: err.keyValue });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/employees/login
 * identifier = employeeId | email | mobile
 * returns JWT + employee info
 */
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = employeeLoginSchema.parse(req.body);

    const user = await Employee.findOne({
      $or: [
        { employeeId: identifier },
        { email: identifier.toLowerCase() },
        { mobile: identifier },
      ],
    });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    if (user.status !== "Accepted") {
      return res.status(403).json({ error: `Your account is ${user.status}.` });
    }

    const token = jwt.sign(
      {
        sub: user._id,
        role: "employee",
        email: user.email,
        employeeId: user.employeeId,
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "1d" }
    );

    res.json({
      token,
      employee: {
        _id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        section: user.section,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    if (err?.name === "ZodError") {
      return res.status(400).json({ error: "Validation failed", details: err.flatten() });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/employees/me
 * employee self profile
 */
router.get("/me", requireAuth("employee"), async (req, res) => {
  try {
    const emp = await Employee.findById(req.auth.sub).lean();
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    res.json({
      _id: emp._id,
      employeeId: emp.employeeId,
      name: emp.name,
      email: emp.email,
      mobile: emp.mobile,
      address: emp.address,
      role: emp.role,
      section: emp.section,
      status: emp.status,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /api/employees/me
 * employee updates own basic fields
 * (updatedAt handled by Mongoose timestamps)
 */
router.patch("/me", requireAuth("employee"), async (req, res) => {
  try {
    const { name, mobile, address } = req.body || {};
    if (!name || !mobile) {
      return res.status(400).json({ error: "name and mobile are required" });
    }

    const updated = await Employee.findByIdAndUpdate(
      req.auth.sub,
      {
        name: String(name).trim(),
        mobile: String(mobile).trim(),
        address: String(address || "").trim(),
      },
      { new: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: "Employee not found" });

    res.json({
      _id: updated._id,
      employeeId: updated.employeeId,
      name: updated.name,
      email: updated.email,
      mobile: updated.mobile,
      address: updated.address,
      role: updated.role,
      section: updated.section,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/employees/directory
 * list accepted employees for chat directory
 */
router.get("/directory", requireAuth("employee"), async (req, res) => {
  try {
    const items = await Employee.find({ status: "Accepted" })
      .select("name employeeId role section")
      .sort({ name: 1 })
      .lean();

    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// --- OWNER APPROVAL ENDPOINTS ---

/**
 * GET /api/employees?status=Pending&role=Chef&section=Back%20of%20House&q=arjun
 */
router.get("/", requireAuth("owner"), async (req, res) => {
  try {
    const { status, role, section, q } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (role) filter.role = role;
    if (section) filter.section = section;

    if (q) {
      const rx = new RegExp(String(q), "i");
      filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }, { employeeId: rx }];
    }

    const employees = await Employee.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ employees });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * PATCH /api/employees/:id/status
 * body: { status: "Accepted" | "Rejected" | "Pending" }
 */
router.patch("/:id/status", requireAuth("owner"), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    const allowed = new Set(["Pending", "Accepted", "Rejected"]);
    if (!allowed.has(status)) return res.status(400).json({ error: "Invalid status" });

    const updated = await Employee.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!updated) return res.status(404).json({ error: "Employee not found" });

    res.json({ message: "Updated", employee: updated });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
