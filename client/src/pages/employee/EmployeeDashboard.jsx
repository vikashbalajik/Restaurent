// client/src/pages/EmployeeDashboard.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "../../styles/employeePages.css";

import { SS_KEYS, lsReadArray, getEmpProfile, yyyyMmDd, startOfWeekMon } from "../../utils/ssStore";
import { applyEmpTheme, getEmpTheme } from "../../utils/empTheme";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const me = getEmpProfile();

  const [theme, setTheme] = useState(getEmpTheme());

  // ✅ fix: do not return string from effect
  useEffect(() => {
    applyEmpTheme(theme);
  }, [theme]);

  const logout = () => {
    localStorage.removeItem("emp_token");
    localStorage.removeItem("emp_profile");
    try {
      localStorage.removeItem(SS_KEYS.EMP_TOKEN);
      localStorage.removeItem(SS_KEYS.EMP_PROFILE);
    } catch {}
    navigate("/employee-login");
  };

  const shifts = useMemo(() => lsReadArray(SS_KEYS.SHIFTS), []);
  const today = yyyyMmDd(new Date());
  const weekStart = startOfWeekMon(today);

  const myWeek = useMemo(() => {
    if (!me?.employeeId) return [];
    return shifts
      .filter((s) => s.weekStart === weekStart)
      .filter((s) => {
        const assigned = s.assignedTo?.employeeId === me.employeeId;
        const picked = s.pickedBy?.employeeId === me.employeeId;
        return assigned || picked;
      })
      .sort((a, b) => (a.date === b.date ? (a.start > b.start ? 1 : -1) : a.date > b.date ? 1 : -1));
  }, [shifts, me?.employeeId, weekStart]);

  const myToday = useMemo(() => {
    if (!me?.employeeId) return [];
    return shifts
      .filter((s) => s.date === today)
      .filter((s) => {
        const assigned = s.assignedTo?.employeeId === me.employeeId;
        const picked = s.pickedBy?.employeeId === me.employeeId;
        return assigned || picked;
      })
      .sort((a, b) => (a.start > b.start ? 1 : -1));
  }, [shifts, me?.employeeId, today]);

  const nextShift = useMemo(() => {
    if (!me?.employeeId) return null;

    const mine = shifts
      .filter((s) => {
        const assigned = s.assignedTo?.employeeId === me.employeeId;
        const picked = s.pickedBy?.employeeId === me.employeeId;
        return assigned || picked;
      })
      .sort((a, b) => (a.date === b.date ? (a.start > b.start ? 1 : -1) : a.date > b.date ? 1 : -1));

    const now = new Date();
    for (const s of mine) {
      const when = new Date(`${s.date}T${s.start || "00:00"}`);
      if (when >= now) return s;
    }
    return null;
  }, [shifts, me?.employeeId]);

  const cards = [
    {
      title: "Weekly Timesheet",
      sub: "Fill Mon–Sun, submit once per week",
      icon: "🗓️",
      to: "/employee/weekly-timesheet",
      pill: "Primary",
    },
    { title: "Leave Requests", sub: "Request leave for approval", icon: "🏖", to: "/employee/leave-requests", pill: "Requests" },
    { title: "Shifts", sub: "View & pick shifts", icon: "🕒", to: "/employee/shifts", pill: "Schedule" },
    { title: "Announcements", sub: "Read owner announcements", icon: "📢", to: "/employee/announcements", pill: "Updates" },
    { title: "Chat", sub: "Message teammates", icon: "💬", to: "/employee/chat", pill: "Team" },
    { title: "My Profile", sub: "Update your details", icon: "👤", to: "/employee/profile", pill: "Account" },
    { title: "Settings", sub: "Theme + change password", icon: "⚙️", to: "/employee/settings", pill: "Control" },
  ];

  if (!me) {
    return (
      <div className="ep-page">
        <div className="ep-shell">
          <main className="ep-glass ep-fade-in">
            <header className="ep-topbar">
              <div className="ep-title">
                <h1>Employee Dashboard</h1>
                <p>Session expired. Please log in again.</p>
              </div>
            </header>
            <section className="ep-content">
              <div className="ep-alert error">Cannot read employee profile. Please login again.</div>
              <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                <button className="ep-btn ep-btn-primary" onClick={() => navigate("/employee-login")}>
                  Go to Employee Login
                </button>
                <button className="ep-btn ep-btn-outline" onClick={() => navigate("/")}>
                  Home
                </button>
              </div>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="ep-page">
      <div className="ep-shell">
        <main className="ep-glass ep-fade-in">
          <header className="ep-topbar">
            <div className="ep-brand">
              <img src={logo} alt="SS" />
              <div className="ep-title">
                <h1>Employee Dashboard</h1>
                <p>
                  Welcome{me?.name ? `, ${me.name}` : ""} • {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="ep-actions">
              <select
                className="ep-select"
                style={{ maxWidth: 170 }}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                aria-label="Theme"
                title="Theme"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="vivid">Colorful</option>
              </select>

              <button className="ep-btn ep-btn-outline" onClick={() => navigate("/")}>
                Home
              </button>
              <button className="ep-btn ep-btn-danger" onClick={logout}>
                Log out
              </button>
            </div>
          </header>

          <section className="ep-content">
            <div className="ep-dash">
              <div className="ep-dash-top">
                <div className="ep-card">
                  <div className="ep-kicker">
                    <h2>Today</h2>
                    <div className="ep-mini">{today}</div>
                  </div>

                  {myToday.length === 0 ? (
                    <div className="ep-empty">No shifts assigned for today.</div>
                  ) : (
                    <div className="ep-badges">
                      {myToday.map((s) => (
                        <span key={s.id} className="ep-badge blue">
                          {s.start}–{s.end} • {s.section || "Section"} • {s.role || "Role"}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="ep-divider" />

                  <div className="ep-kicker" style={{ marginBottom: 0 }}>
                    <h2>Next shift</h2>
                    <div className="ep-mini">
                      {nextShift ? new Date(nextShift.date).toLocaleDateString() : "—"}
                    </div>
                  </div>

                  {nextShift ? (
                    <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <span className="ep-badge green">{nextShift.start}–{nextShift.end}</span>
                      <span className="ep-badge">{nextShift.section || "Section"}</span>
                      <span className="ep-badge">{nextShift.role || "Role"}</span>
                      <span className="ep-badge blue">{nextShift.day || "Day"}</span>
                    </div>
                  ) : (
                    <div className="ep-empty" style={{ marginTop: 10 }}>
                      No upcoming shift found.
                    </div>
                  )}
                </div>

                <div className="ep-card">
                  <div className="ep-kicker">
                    <h2>Quick info</h2>
                    <div className="ep-mini">This week: {weekStart}</div>
                  </div>

                  <div className="ep-statgrid">
                    <div className="ep-stat">
                      <div className="k">Employee ID</div>
                      <div className="v">{me.employeeId || "—"}</div>
                    </div>
                    <div className="ep-stat">
                      <div className="k">Role</div>
                      <div className="v">{me.role || "—"}</div>
                    </div>
                    <div className="ep-stat">
                      <div className="k">Section</div>
                      <div className="v">{me.section || "—"}</div>
                    </div>
                    <div className="ep-stat">
                      <div className="k">Shifts (week)</div>
                      <div className="v">{myWeek.length}</div>
                    </div>
                  </div>

                  <div className="ep-divider" />

                  <button className="ep-btn ep-btn-primary" onClick={() => navigate("/employee/settings")}>
                    ⚙️ Open Settings
                  </button>
                </div>
              </div>

              <div className="ep-actions-grid" aria-label="Employee actions">
                {cards.map((c) => (
                  <button key={c.title} className="ep-action" onClick={() => navigate(c.to)} type="button">
                    <div className="ep-action-top">
                      <div className="ep-action-ico">{c.icon}</div>
                      <span className="ep-pill">{c.pill}</span>
                    </div>
                    <div className="ep-action-title">{c.title}</div>
                    <div className="ep-action-sub">{c.sub}</div>
                    <div className="ep-action-foot">
                      <span className="ep-muted" style={{ fontWeight: 900 }}>
                        Open →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
