// server/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const connectDB = require("./config/db");
const Owner = require("./models/Owner");

// routes
const authRoutes = require("./routes/auth");
const ownerRoutes = require("./routes/owners");
const employeeRoutes = require("./routes/employees");

// feature routes (keep these if the files exist in your project)
const timesheetRoutes = require("./routes/timesheets");
const leaveRoutes = require("./routes/leaveRequests");
const shiftRoutes = require("./routes/shifts");
const announcementRoutes = require("./routes/announcements");
const messageRoutes = require("./routes/messages");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"] }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

// mount all routes ONCE (before listen)
app.use("/api/auth", authRoutes);
app.use("/api/owners", ownerRoutes);
app.use("/api/employees", employeeRoutes);

app.use("/api/timesheets", timesheetRoutes);
app.use("/api/leave-requests", leaveRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/messages", messageRoutes);

// seed owners (runs after DB connect, before server starts)
async function ensureOwners() {
  const owners = [
    { email: "owner1@gmail.com", password: "Owner1@1", name: "Owner 1" },
    { email: "owner2@gmail.com", password: "Owner2@2", name: "Owner 2" },
  ];

  for (const o of owners) {
    const email = o.email.toLowerCase();
    const found = await Owner.findOne({ email });
    if (!found) {
      await Owner.create({
        email,
        name: o.name,
        passwordHash: await bcrypt.hash(o.password, 12),
      });
      console.log("✅ Seeded owner:", email);
    }
  }
}

const PORT = process.env.PORT || 5001;

connectDB()
  .then(async () => {
    await ensureOwners();
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch((e) => {
    console.error("Mongo connection failed", e);
    process.exit(1);
  });
