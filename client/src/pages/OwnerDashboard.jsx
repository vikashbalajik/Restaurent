// src/pages/OwnerDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/ownerPages.css";
import { SS_KEYS, lsReadArray, getEmployeeStatus } from "../utils/ssStore";

const THEME_KEY = "op_theme";
const readTheme = () => localStorage.getItem(THEME_KEY) || "light";
const applyTheme = (t) => {
  const theme = t || "light";
  document.body.dataset.opTheme = theme;
  localStorage.setItem(THEME_KEY, theme);
};

function OwnerTile({ icon, title, blurb, onClick }) {
  return (
    <button className="op-tile" type="button" onClick={onClick}>
      <div className="icon" aria-hidden="true">{icon}</div>
      <div className="name">{title}</div>
      <div className="desc">{blurb}</div>
    </button>
  );
}

function NavItem({ icon, label, meta, to, active }) {
  return (
    <Link to={to} className={`op-navitem ${active ? "is-active" : ""}`}>
      <div className="op-navleft">
        <div className="op-navicon" aria-hidden="true">{icon}</div>
        <div>
          <div style={{ fontWeight: 950 }}>{label}</div>
          {meta ? <div className="op-navmeta">{meta}</div> : null}
        </div>
      </div>
      <span style={{ color: "var(--op-muted)", fontWeight: 950 }}>›</span>
    </Link>
  );
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [owner, setOwner] = useState({ name: "Owner", email: "" });
  const [theme, setTheme] = useState(readTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    // apply theme on first mount too (helps if user lands here first)
    applyTheme(readTheme());

    try {
      const p = JSON.parse(localStorage.getItem("owner_profile") || "{}");
      if (p?.email) setOwner({ name: p.name || "Owner", email: p.email });
    } catch {}
  }, []);

  const token = useMemo(() => localStorage.getItem("owner_token"), []);

  const logout = () => {
    localStorage.removeItem("owner_token");
    localStorage.removeItem("owner_profile");
    navigate("/owner-login", { replace: true });
  };

  // KPIs from local storage
  const employees = lsReadArray(SS_KEYS.EMPLOYEES);
  const totalEmployees = employees.length;
  const inactiveEmployees = employees.filter((e) => getEmployeeStatus(e.employeeId) === "Inactive").length;
  const activeEmployees = Math.max(0, totalEmployees - inactiveEmployees);

  const getCount = (key) => {
    try { return (JSON.parse(localStorage.getItem(key) || "[]") || []).length; }
    catch { return 0; }
  };

  const pendingTimesheets = getCount(SS_KEYS.TIMESHEET_REQUESTS);
  const pendingLeaves = getCount(SS_KEYS.LEAVE_REQUESTS);
  const shiftsCount = getCount(SS_KEYS.SHIFTS);
  const annCount = getCount(SS_KEYS.ANNOUNCEMENTS);

  const health = useMemo(() => {
    const warnings = [];
    if (pendingTimesheets > 0) warnings.push(`${pendingTimesheets} timesheet(s) pending`);
    if (pendingLeaves > 0) warnings.push(`${pendingLeaves} leave request(s) pending`);
    if (inactiveEmployees > 0) warnings.push(`${inactiveEmployees} inactive employee(s)`);
    if (warnings.length === 0) return { tone: "ok", title: "All good", msg: "No urgent actions right now." };
    if (warnings.length >= 3) return { tone: "warn", title: "Attention needed", msg: warnings.join(" • ") };
    return { tone: "info", title: "Review queue", msg: warnings.join(" • ") };
  }, [pendingTimesheets, pendingLeaves, inactiveEmployees]);

  const activePath = location.pathname;

  return (
    <div className="op-page">
      <div className="op-shell">
        <div className="op-layout">
          {/* Sidebar */}
          <aside className="op-sidebar">
            <div className="op-sidehead">
              <img src={logo} alt="SS" />
              <div className="t">
                <b>{owner.name}</b>
                <span>{owner.email || "owner"}</span>
              </div>
            </div>

            <nav className="op-sidenav" aria-label="Owner navigation">
              <NavItem icon="🏠" label="Dashboard" meta="Overview & KPIs" to="/owner-dashboard" active={activePath === "/owner-dashboard"} />
              <NavItem icon="🧑‍💼" label="Manage Employees" meta="Deactivate / Reactivate" to="/owner/manage-employees" active={activePath.includes("/owner/manage-employees")} />
              <NavItem icon="💬" label="Owner Chat" meta="Message employees" to="/owner/chat" active={activePath.includes("/owner/chat")} />
              <NavItem icon="🗓" label="Timesheets" meta="Approve hours" to="/owner/timesheets" active={activePath.includes("/owner/timesheets")} />
              <NavItem icon="📝" label="Leave Requests" meta="Approve / Reject" to="/owner/leave-requests" active={activePath.includes("/owner/leave-requests")} />
              <NavItem icon="📊" label="Shift Scheduling" meta="Publish & assign" to="/owner/shifts" active={activePath.includes("/owner/shifts")} />
              <NavItem icon="📢" label="Announcements" meta="Broadcast updates" to="/owner/announcements" active={activePath.includes("/owner/announcements")} />
              <NavItem icon="🍽" label="Menu & Specials" meta="Manage menu items" to="/owner/menu" active={activePath.includes("/owner/menu")} />
              <NavItem icon="📈" label="Reports" meta="Sales & Ops analytics" to="/owner/reports" active={activePath.includes("/owner/reports")} />
              <NavItem icon="⚙️" label="Settings" meta="Theme • Password • Backup" to="/owner/settings" active={activePath.includes("/owner/settings")} />
            </nav>

            <div style={{ padding: 12, borderTop: "1px solid var(--op-line)" }}>
              {/* Theme switch (quick) */}
              <div className="op-muted" style={{ marginBottom: 8 }}>Theme</div>
              <div className="op-theme-switch" style={{ marginBottom: 10 }}>
                <button
                  className={`op-theme-pill ${theme === "light" ? "is-active" : ""}`}
                  onClick={() => setTheme("light")}
                  type="button"
                >
                  ☀️
                </button>
                <button
                  className={`op-theme-pill ${theme === "dark" ? "is-active" : ""}`}
                  onClick={() => setTheme("dark")}
                  type="button"
                >
                  🌙
                </button>
                <button
                  className={`op-theme-pill ${theme === "colorful" ? "is-active" : ""}`}
                  onClick={() => setTheme("colorful")}
                  type="button"
                >
                  🎨
                </button>
              </div>

              <Link to="/home" className="op-btn op-btn-outline" style={{ width: "100%", justifyContent: "center" }}>
                Home
              </Link>
              <button className="op-btn op-btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} onClick={logout}>
                Log out
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="op-glass op-fade-in" role="main" aria-label="Owner dashboard">
            <header className="op-topbar">
              <div className="op-title">
                <h1>Owner Dashboard</h1>
                <p>Command center • KPIs • Actions • Shortcuts</p>
              </div>

              <div className="op-actions">
                {!token ? (
                  <Link to="/owner-login" className="op-btn op-btn-primary">Go to login</Link>
                ) : (
                  <span className="op-badge blue">Signed in • {theme}</span>
                )}
              </div>
            </header>

            <section className="op-content">
              {!token && (
                <div className="op-alert error" style={{ marginBottom: 12 }}>
                  You’re not logged in. <Link to="/owner-login">Go to owner login</Link>
                </div>
              )}

              {/* KPI row */}
              <div className="op-kpis">
                <div className="op-kpi">
                  <div className="label">Employees (Active)</div>
                  <div className="value">{activeEmployees}</div>
                  <div className="sub">Ready for shifts</div>
                </div>
                <div className="op-kpi">
                  <div className="label">Employees (Inactive)</div>
                  <div className="value">{inactiveEmployees}</div>
                  <div className="sub">No access</div>
                </div>
                <div className="op-kpi">
                  <div className="label">Pending Timesheets</div>
                  <div className="value">{pendingTimesheets}</div>
                  <div className="sub">Approve to update reports</div>
                </div>
                <div className="op-kpi">
                  <div className="label">Pending Leave Requests</div>
                  <div className="value">{pendingLeaves}</div>
                  <div className="sub">Keep staffing healthy</div>
                </div>
              </div>

              {/* Health + quick actions */}
              <div className="op-row">
                <div className="op-card">
                  <h2>Today’s operational health</h2>
                  <div className={`op-alert ${health.tone}`} style={{ marginTop: 10 }}>
                    <b>{health.title}:</b> {health.msg}
                  </div>

                  <div className="op-divider" />

                  <div className="op-muted">Quick counts</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                    <span className="op-badge blue">Shifts: {shiftsCount}</span>
                    <span className="op-badge blue">Announcements: {annCount}</span>
                    <span className="op-badge green">Active: {activeEmployees}</span>
                    <span className="op-badge red">Inactive: {inactiveEmployees}</span>
                  </div>
                </div>

                <div className="op-card">
                  <h2>Fast actions</h2>
                  <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                    <button className="op-btn op-btn-primary" type="button" onClick={() => navigate("/owner/reports")}>
                      📈 Open Reports
                    </button>
                    <button className="op-btn op-btn-outline" type="button" onClick={() => navigate("/owner/manage-employees")}>
                      🧑‍💼 Manage Employees
                    </button>
                    <button className="op-btn op-btn-outline" type="button" onClick={() => navigate("/owner/timesheets")}>
                      🗓 Review Timesheets
                    </button>
                    <button className="op-btn op-btn-outline" type="button" onClick={() => navigate("/owner/shifts")}>
                      📊 Create / Publish Shifts
                    </button>
                    <button className="op-btn op-btn-outline" type="button" onClick={() => navigate("/owner/settings")}>
                      ⚙️ Settings (theme/password/backup)
                    </button>
                  </div>
                </div>
              </div>

              {/* Tiles */}
              <div style={{ marginTop: 12 }}>
                <div className="op-muted" style={{ marginBottom: 10 }}>Modules</div>

                <div className="op-grid">
                  <OwnerTile icon="🧑‍💼" title="Manage Employees" blurb="Deactivate/reactivate accounts (no data loss)" onClick={() => navigate("/owner/manage-employees")} />
                  <OwnerTile icon="💬" title="Owner Chat" blurb="Message employees instantly" onClick={() => navigate("/owner/chat")} />
                  <OwnerTile icon="🗓" title="Timesheets" blurb="Approve submitted timesheets" onClick={() => navigate("/owner/timesheets")} />
                  <OwnerTile icon="📝" title="Leave Requests" blurb="Approve or reject leave" onClick={() => navigate("/owner/leave-requests")} />
                  <OwnerTile icon="📊" title="Shift Scheduling" blurb="Assign and manage shifts" onClick={() => navigate("/owner/shifts")} />
                  <OwnerTile icon="📢" title="Announcements" blurb="Post updates to staff" onClick={() => navigate("/owner/announcements")} />
                  <OwnerTile icon="🍽" title="Menu & Specials" blurb="Add dishes & daily specials" onClick={() => navigate("/owner/menu")} />
                  <OwnerTile icon="📈" title="Reports" blurb="Sales & operations insights" onClick={() => navigate("/owner/reports")} />
                  <OwnerTile icon="⚙️" title="Settings" blurb="Theme • Change password • Backup" onClick={() => navigate("/owner/settings")} />
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
