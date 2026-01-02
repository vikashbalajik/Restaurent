// src/pages/OwnerShifts.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/ownerPages.css";
import {
  SS_KEYS,
  lsReadArray,
  lsWrite,
  uid,
  yyyyMmDd,
  startOfWeekMon,
  dateToDayShort,
  createAnnouncement,
} from "../utils/ssStore";

const SECTION_OPTIONS = ["Front of House", "Back of House"];

const ROLES_BY_SECTION = {
  "Front of House": [
    "Host/Hostess",
    "Server/Waiter/Waitress",
    "Food Runner",
    "Busser",
    "Bartender",
    "Cashier",
    "Manager",
  ],
  "Back of House": ["Executive Chef", "Chef de Cuisine", "Sous Chef", "Line Cook", "Dishwasher"],
};

const SECTION_BY_ROLE = Object.entries(ROLES_BY_SECTION).reduce((acc, [sec, roles]) => {
  roles.forEach((r) => (acc[r] = sec));
  return acc;
}, {});

const hoursBetween = (startHHMM, endHHMM) => {
  const [sh, sm] = String(startHHMM).split(":").map(Number);
  const [eh, em] = String(endHHMM).split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const diff = Math.max(0, eh * 60 + em - (sh * 60 + sm));
  return Number((diff / 60).toFixed(2));
};

export default function OwnerShifts() {
  const today = yyyyMmDd(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeekMon(today));
  const [date, setDate] = useState(weekStart);

  const [section, setSection] = useState("Front of House");
  const [role, setRole] = useState("Cashier");

  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("17:00");
  const [notes, setNotes] = useState("");
  const [assignEmpId, setAssignEmpId] = useState("");

  const [toast, setToast] = useState("");

  const [employees, setEmployees] = useState(() => lsReadArray(SS_KEYS.EMPLOYEES));
  const [shifts, setShifts] = useState(() => lsReadArray(SS_KEYS.SHIFTS));

  useEffect(() => {
    setDate(weekStart);
  }, [weekStart]);

  useEffect(() => {
    const refresh = () => {
      setEmployees(lsReadArray(SS_KEYS.EMPLOYEES));
      setShifts(lsReadArray(SS_KEYS.SHIFTS));
    };
    refresh();

    const onStorage = (e) => {
      if (!e.key) return;
      if ([SS_KEYS.EMPLOYEES, SS_KEYS.SHIFTS].includes(e.key)) refresh();
    };

    window.addEventListener("storage", onStorage);
    const t = setInterval(refresh, 800);
    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(t);
    };
  }, []);

  const rolesForSection = useMemo(() => ROLES_BY_SECTION[section] || [], [section]);

  useEffect(() => {
    if (!rolesForSection.includes(role)) {
      setRole(rolesForSection[0] || "Cashier");
      setAssignEmpId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  const onRoleChange = (nextRole) => {
    setRole(nextRole);
    setAssignEmpId("");
    const sec = SECTION_BY_ROLE[nextRole] || "Front of House";
    if (sec !== section) setSection(sec);
  };

  const roleEmployees = useMemo(() => {
    const r = role.toLowerCase();
    return employees.filter((e) => String(e.role || "").toLowerCase() === r);
  }, [employees, role]);

  const shiftsThisWeek = useMemo(() => {
    const list = Array.isArray(shifts) ? shifts : [];
    return list.filter((s) => s.weekStart === weekStart).sort((a, b) => (a.date > b.date ? 1 : -1));
  }, [shifts, weekStart]);

  const filteredThisWeek = useMemo(() => {
    return shiftsThisWeek.filter((s) => {
      const roleOk = String(s.role || "").toLowerCase() === role.toLowerCase();
      const secOk = String(s.section || "").toLowerCase() === section.toLowerCase();
      return roleOk && secOk;
    });
  }, [shiftsThisWeek, role, section]);

  const stats = useMemo(() => {
    const total = filteredThisWeek.length;
    const published = filteredThisWeek.filter((s) => !!s.published).length;
    const assigned = filteredThisWeek.filter((s) => !!(s.assignedTo || s.pickedBy)).length;
    const hrs = filteredThisWeek.reduce((sum, s) => sum + hoursBetween(s.start, s.end), 0);
    return { total, published, assigned, hrs: Number(hrs.toFixed(2)) };
  }, [filteredThisWeek]);

  const saveShifts = (next, toastMsg) => {
    setShifts(next);
    lsWrite(SS_KEYS.SHIFTS, next);
    if (toastMsg) {
      setToast(toastMsg);
      window.clearTimeout(window.__ss_toast);
      window.__ss_toast = window.setTimeout(() => setToast(""), 2500);
    }
  };

  const createShift = (e) => {
    e.preventDefault();

    const day = dateToDayShort(date);
    const pickedEmp = roleEmployees.find((x) => x.employeeId === assignEmpId);

    const newShift = {
      id: uid(),
      weekStart,
      date,
      day,
      role,
      section,
      start,
      end,
      notes,
      published: false,
      assignedTo: assignEmpId
        ? { employeeId: pickedEmp?.employeeId || assignEmpId, name: pickedEmp?.name || "Assigned" }
        : null,
      pickedBy: null,
      createdAt: new Date().toISOString(),
    };

    const next = [newShift, ...(Array.isArray(shifts) ? shifts : [])];
    saveShifts(next, "✅ Shift created");
  };

  const deleteShift = (id) => {
    const next = (Array.isArray(shifts) ? shifts : []).filter((s) => s.id !== id);
    saveShifts(next, "🗑️ Shift deleted");
  };

  const publishOne = (id) => {
    const next = (Array.isArray(shifts) ? shifts : []).map((s) => (s.id !== id ? s : { ...s, published: true }));
    saveShifts(next, "📢 Shift published");
  };

  const unpublishOne = (id) => {
    const next = (Array.isArray(shifts) ? shifts : []).map((s) => (s.id !== id ? s : { ...s, published: false }));
    saveShifts(next, "↩️ Shift moved to draft");
  };

  const publishRoleWeek = () => {
    const next = (Array.isArray(shifts) ? shifts : []).map((s) => {
      if (s.weekStart !== weekStart) return s;
      if (String(s.role || "").toLowerCase() !== role.toLowerCase()) return s;
      if (String(s.section || "").toLowerCase() !== section.toLowerCase()) return s;
      return { ...s, published: true };
    });

    lsWrite(SS_KEYS.SHIFTS, next);
    setShifts(next);

    createAnnouncement({
      title: `${role} shifts released`,
      message: `New ${role} shifts are available for the week starting ${new Date(weekStart).toLocaleDateString()}.`,
      audience: { type: "role", role },
    });

    setToast("📢 Published shifts + sent notification");
    window.clearTimeout(window.__ss_toast);
    window.__ss_toast = window.setTimeout(() => setToast(""), 2500);
  };

  const assignShift = (shiftId, employeeId) => {
    const emp = employees.find((e) => e.employeeId === employeeId);
    const next = (Array.isArray(shifts) ? shifts : []).map((s) => {
      if (s.id !== shiftId) return s;
      if (!employeeId) return { ...s, assignedTo: null };
      return {
        ...s,
        assignedTo: { employeeId, name: emp?.name || employeeId },
        pickedBy: null,
      };
    });
    saveShifts(next, employeeId ? "✅ Assigned to employee" : "↩️ Unassigned");
  };

  const statusMeta = (s) => {
    const isAssigned = !!(s.assignedTo || s.pickedBy);
    if (isAssigned) return { label: "Assigned", cls: "green" };
    if (s.published) return { label: "Available", cls: "amber" };
    return { label: "Draft", cls: "blue" };
  };

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-title">
              <h1>Shift Scheduling</h1>
              <p>Create drafts → Assign directly or Publish → Employees pick (role-locked). Syncs across pages.</p>
            </div>
            <div className="op-actions">
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">
                ← Dashboard
              </Link>
            </div>
          </header>

          <section className="op-content">
            {toast && <div className="op-alert success" style={{ marginBottom: 12 }}>{toast}</div>}

            <div className="op-row">
              {/* LEFT: Create */}
              <div className="op-card">
                <h2>Create shift</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                  <span className="op-badge blue">Week: {new Date(weekStart).toLocaleDateString()}</span>
                  <span className="op-badge amber">Role: {role}</span>
                  <span className="op-badge blue">Section: {section}</span>
                </div>

                <form className="op-form" onSubmit={createShift}>
                  <div>
                    <label>Week starting (Mon)</label>
                    <input
                      className="op-input"
                      type="date"
                      value={weekStart}
                      onChange={(e) => setWeekStart(startOfWeekMon(e.target.value))}
                    />
                  </div>

                  <div className="op-row">
                    <div>
                      <label>Date</label>
                      <input className="op-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                    </div>
                    <div>
                      <label>Day</label>
                      <input className="op-input" value={dateToDayShort(date)} readOnly />
                    </div>
                  </div>

                  <div className="op-row">
                    <div>
                      <label>Section</label>
                      <select className="op-select" value={section} onChange={(e) => setSection(e.target.value)}>
                        {SECTION_OPTIONS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label>Role</label>
                      <select className="op-select" value={role} onChange={(e) => onRoleChange(e.target.value)}>
                        {rolesForSection.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="op-row">
                    <div>
                      <label>Start</label>
                      <input className="op-input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
                    </div>
                    <div>
                      <label>End</label>
                      <input className="op-input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label>Assign directly (optional)</label>
                    <select className="op-select" value={assignEmpId} onChange={(e) => setAssignEmpId(e.target.value)}>
                      <option value="">— Leave as Draft (employees pick after publish) —</option>
                      {roleEmployees.map((e) => (
                        <option key={e.employeeId} value={e.employeeId}>
                          {e.name} ({e.employeeId})
                        </option>
                      ))}
                    </select>
                    <div className="op-muted" style={{ marginTop: 6 }}>
                      Shows only employees whose role = <b>{role}</b>.
                    </div>
                  </div>

                  <div>
                    <label>Notes</label>
                    <textarea className="op-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button className="op-btn op-btn-primary" type="submit">
                      Create shift
                    </button>
                    <button
                      className="op-btn op-btn-outline"
                      type="button"
                      onClick={publishRoleWeek}
                      title="Publishes all shifts for the selected role/section/week and notifies that role."
                    >
                      📢 Publish {role} (this week)
                    </button>
                  </div>
                </form>
              </div>

              {/* RIGHT: Table */}
              <div className="op-card">
                <h2>Shifts for this week</h2>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "10px 0 12px" }}>
                  <span className="op-badge blue">Total: {stats.total}</span>
                  <span className="op-badge amber">Published: {stats.published}</span>
                  <span className="op-badge green">Assigned: {stats.assigned}</span>
                  <span className="op-badge blue">Hours: {stats.hrs}</span>
                </div>

                {filteredThisWeek.length === 0 ? (
                  <div className="op-empty">
                    No shifts for <b>{role}</b> / <b>{section}</b> in this week.
                  </div>
                ) : (
                  <div className="op-table-wrap" style={{ marginTop: 6 }}>
                    <table className="op-table" style={{ minWidth: 860 }}>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Day</th>
                          <th>Time</th>
                          <th>Status</th>
                          <th>Assigned</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredThisWeek.map((s) => {
                          const hrs = hoursBetween(s.start, s.end);
                          const assignedName = s.assignedTo?.name || s.pickedBy?.name || "—";
                          const st = statusMeta(s);

                          return (
                            <tr key={s.id}>
                              <td>{new Date(s.date).toLocaleDateString()}</td>
                              <td><span className="op-badge blue">{s.day}</span></td>
                              <td>
                                <div style={{ fontWeight: 900 }}>
                                  {s.start} – {s.end}{" "}
                                  <span className="op-muted" style={{ marginLeft: 8 }}>{hrs.toFixed(1)}h</span>
                                </div>
                              </td>
                              <td><span className={`op-badge ${st.cls}`}>{st.label}</span></td>
                              <td style={{ fontWeight: 900 }}>{assignedName}</td>
                              <td>
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                  <select
                                    className="op-select"
                                    style={{ minWidth: 220 }}
                                    value={s.assignedTo?.employeeId || ""}
                                    onChange={(e) => assignShift(s.id, e.target.value)}
                                    title="Assign / Unassign"
                                  >
                                    <option value="">— Assign —</option>
                                    {employees
                                      .filter(
                                        (e) =>
                                          String(e.role || "").toLowerCase() ===
                                          String(s.role || "").toLowerCase()
                                      )
                                      .map((e) => (
                                        <option key={e.employeeId} value={e.employeeId}>
                                          {e.name} ({e.employeeId})
                                        </option>
                                      ))}
                                  </select>

                                  {!s.published ? (
                                    <button className="op-btn op-btn-outline" type="button" onClick={() => publishOne(s.id)}>
                                      Publish
                                    </button>
                                  ) : (
                                    <button className="op-btn op-btn-outline" type="button" onClick={() => unpublishOne(s.id)}>
                                      Draft
                                    </button>
                                  )}

                                  <button className="op-btn op-btn-danger" type="button" onClick={() => deleteShift(s.id)}>
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="op-muted" style={{ marginTop: 12, fontWeight: 900 }}>
                  ✅ Employees see <b>Available</b> shifts only after publish. <b>Assigned</b> shifts show immediately.
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
