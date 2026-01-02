// client/src/pages/employee/EmployeeShifts.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import "../../styles/employeePages.css";

import {
  SS_KEYS,
  lsReadArray,
  lsWrite,
  getEmpProfile,
  yyyyMmDd,
  startOfWeekMon,
} from "../../utils/ssStore";
import { applyEmpTheme, getEmpTheme } from "../../utils/empTheme";

const hoursBetween = (startHHMM, endHHMM) => {
  const [sh, sm] = String(startHHMM || "").split(":").map(Number);
  const [eh, em] = String(endHHMM || "").split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const diff = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  return Number((diff / 60).toFixed(2));
};

export default function EmployeeShifts() {
  const [theme] = useState(getEmpTheme());
  useEffect(() => {
    applyEmpTheme(theme);
  }, [theme]);

  const profile = getEmpProfile();
  const employeeId = profile?.employeeId;
  const role = profile?.role || "Unknown";

  const today = yyyyMmDd(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeekMon(today));

  const [shifts, setShifts] = useState(() => lsReadArray(SS_KEYS.SHIFTS));
  const [toast, setToast] = useState("");

  useEffect(() => {
    const refresh = () => setShifts(lsReadArray(SS_KEYS.SHIFTS));
    refresh();

    const onStorage = (e) => {
      if (e.key === SS_KEYS.SHIFTS) refresh();
    };

    window.addEventListener("storage", onStorage);
    const t = setInterval(refresh, 900);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(t);
    };
  }, []);

  const weekShifts = useMemo(() => {
    const list = Array.isArray(shifts) ? shifts : [];
    return list
      .filter((s) => s.weekStart === weekStart)
      .filter((s) => String(s.role || "").toLowerCase() === String(role).toLowerCase())
      .sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [shifts, weekStart, role]);

  const assignedToMe = useMemo(() => {
    return weekShifts.filter((s) => {
      const byOwner = s.assignedTo?.employeeId && s.assignedTo.employeeId === employeeId;
      const byPick = s.pickedBy?.employeeId && s.pickedBy.employeeId === employeeId;
      return byOwner || byPick;
    });
  }, [weekShifts, employeeId]);

  const available = useMemo(() => {
    return weekShifts.filter((s) => {
      const alreadyAssigned = !!(s.assignedTo || s.pickedBy);
      return s.published && !alreadyAssigned;
    });
  }, [weekShifts]);

  const totalHours = useMemo(() => {
    const sum = assignedToMe.reduce((acc, s) => acc + hoursBetween(s.start, s.end), 0);
    return Number(sum.toFixed(2));
  }, [assignedToMe]);

  const pickShift = (shiftId) => {
    if (!employeeId) return;

    const next = (Array.isArray(shifts) ? shifts : []).map((s) => {
      if (s.id !== shiftId) return s;
      if (s.assignedTo || s.pickedBy) return s;
      return {
        ...s,
        pickedBy: { employeeId, name: profile?.name || "Employee" },
      };
    });

    setShifts(next);
    lsWrite(SS_KEYS.SHIFTS, next);

    setToast("✅ Shift picked");
    window.clearTimeout(window.__ss_emp_toast);
    window.__ss_emp_toast = window.setTimeout(() => setToast(""), 2200);
  };

  if (!profile) {
    return (
      <div className="ep-page">
        <div className="ep-shell">
          <main className="ep-glass ep-fade-in">
            <header className="ep-topbar">
              <div className="ep-title">
                <h1>My Shifts</h1>
                <p>Session expired. Please login again.</p>
              </div>
              <div className="ep-actions">
                <Link className="ep-btn ep-btn-primary" to="/employee-login">
                  Go to Employee Login
                </Link>
                <Link className="ep-btn ep-btn-outline" to="/">
                  Home
                </Link>
              </div>
            </header>
          </main>
        </div>
      </div>
    );
  }

  const ShiftRow = ({ s, right }) => {
    const hrs = hoursBetween(s.start, s.end);
    return (
      <div className="ep-row-card">
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="ep-badge blue">{s.day || "Day"}</span>
            <span className="ep-badge">{new Date(s.date).toLocaleDateString()}</span>
            <span className="ep-badge green">
              {s.start}–{s.end} • {hrs.toFixed(1)}h
            </span>
          </div>
          <div className="ep-muted" style={{ fontWeight: 950 }}>
            {s.section || "Section"} • {s.role || "Role"}
          </div>
        </div>
        {right}
      </div>
    );
  };

  return (
    <div className="ep-page">
      <div className="ep-shell">
        <main className="ep-glass ep-fade-in">
          <header className="ep-topbar">
            <div className="ep-brand">
              <img src={logo} alt="SS" />
              <div className="ep-title">
                <h1>My Shifts</h1>
                <p>
                  Role: <b>{role}</b> • Week: <b>{new Date(weekStart).toLocaleDateString()}</b> • Total:{" "}
                  <b>{totalHours}h</b>
                </p>
              </div>
            </div>

            <div className="ep-actions">
              <Link className="ep-btn ep-btn-outline" to="/employee-dashboard">
                ← Dashboard
              </Link>
            </div>
          </header>

          <section className="ep-content">
            {toast && (
              <div className="ep-alert success" style={{ marginBottom: 12 }}>
                {toast}
              </div>
            )}

            <div className="ep-card" style={{ marginBottom: 14 }}>
              <div className="ep-kicker">
                <h2>Week selector</h2>
                <div className="ep-mini">Pick Monday as the week start</div>
              </div>

              <div className="ep-row">
                <div>
                  <label>Week starting (Mon)</label>
                  <input
                    className="ep-input"
                    type="date"
                    value={weekStart}
                    onChange={(e) => setWeekStart(startOfWeekMon(e.target.value))}
                  />
                </div>
                <div>
                  <label>Info</label>
                  <div className="ep-badges" style={{ marginTop: 6 }}>
                    <span className="ep-badge">Assigned/Picked: {assignedToMe.length}</span>
                    <span className="ep-badge blue">Available: {available.length}</span>
                  </div>
                </div>
              </div>

              <div className="ep-muted" style={{ fontSize: 12, fontWeight: 950, marginTop: 10 }}>
                ✅ Weekly total hours includes shifts assigned by the owner + shifts you pick.
              </div>
            </div>

            <div className="ep-grid-2">
              <div className="ep-card">
                <div className="ep-kicker">
                  <h2>Assigned to me</h2>
                  <div className="ep-mini">{assignedToMe.length} shift(s)</div>
                </div>

                {assignedToMe.length === 0 ? (
                  <div className="ep-empty">No assigned shifts yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {assignedToMe.map((s) => {
                      const label = s.assignedTo?.employeeId === employeeId ? "Assigned" : "Picked";
                      return (
                        <ShiftRow
                          key={s.id}
                          s={s}
                          right={<span className={`ep-badge ${label === "Assigned" ? "green" : "blue"}`}>{label}</span>}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="ep-card">
                <div className="ep-kicker">
                  <h2>Available shifts</h2>
                  <div className="ep-mini">{available.length} available</div>
                </div>

                {available.length === 0 ? (
                  <div className="ep-empty">No published shifts available for your role.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {available.map((s) => (
                      <ShiftRow
                        key={s.id}
                        s={s}
                        right={
                          <button className="ep-btn ep-btn-primary" onClick={() => pickShift(s.id)}>
                            Pick
                          </button>
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
