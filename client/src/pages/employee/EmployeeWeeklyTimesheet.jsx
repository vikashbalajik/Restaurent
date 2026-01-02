// client/src/pages/employee/EmployeeWeeklyTimesheet.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/employeePages.css";

import {
  SS_KEYS,
  lsReadArray,
  lsWrite,
  uid,
  getEmpProfile,
  startOfWeekMon,
  yyyyMmDd,
  dayOrder,
  computeWeeklyTotals,
  computeEntryHours,
} from "../../utils/ssStore";

const DAY_TYPES = ["Work", "Holiday", "Leave", "Paid Leave", "Sick Leave", "Off"];

const makeDefaultEntries = () =>
  dayOrder.map((d) => ({
    day: d,
    dayType: "Work",
    start: "09:00",
    end: "18:00",
    breakMins: 60,
    notes: "",
  }));

function safeEntryHours(entry) {
  if (!entry) return 0;
  if (entry.dayType && entry.dayType !== "Work") return 0;
  return computeEntryHours(entry);
}

export default function EmployeeWeeklyTimesheet() {
  const navigate = useNavigate();
  const me = getEmpProfile();

  const weekStartDefault = startOfWeekMon(yyyyMmDd(new Date()));
  const [weekStart, setWeekStart] = useState(weekStartDefault);
  const [entries, setEntries] = useState(makeDefaultEntries());
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const totals = useMemo(() => {
    const normalized = entries.map((e) =>
      e.dayType !== "Work" ? { ...e, start: "", end: "", breakMins: 0 } : e
    );
    return computeWeeklyTotals(normalized);
  }, [entries]);

  const all = useMemo(() => lsReadArray(SS_KEYS.WEEKLY_TIMESHEETS), [ok]);
  const mySubmissions = useMemo(() => {
    if (!me?.employeeId) return [];
    return all
      .filter((t) => String(t.employeeId) === String(me.employeeId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [all, me?.employeeId]);

  const update = (idx, patch) => {
    setEntries((prev) =>
      prev.map((e, i) => {
        if (i !== idx) return e;
        const next = { ...e, ...patch };
        if (next.dayType && next.dayType !== "Work") {
          next.start = "";
          next.end = "";
          next.breakMins = 0;
        }
        return next;
      })
    );
  };

  const submit = (e) => {
    e.preventDefault();
    setOk("");
    setErr("");

    if (!me?.employeeId) {
      setErr("Your session is missing. Please login again as employee.");
      return;
    }
    if (!weekStart) {
      setErr("Please choose the week start (Monday).");
      return;
    }

    for (const en of entries) {
      if (en.dayType === "Work") {
        if (!en.start || !en.end) {
          setErr(`Please fill start/end for ${en.day} (or mark it as Leave/Holiday).`);
          return;
        }
        if (Number(en.breakMins) < 0) {
          setErr("Break minutes cannot be negative.");
          return;
        }
      }
    }

    const already = all.find((t) => t.employeeId === me.employeeId && t.weekStart === weekStart);
    if (already) {
      setErr("You already submitted a weekly timesheet for this week.");
      return;
    }

    const normalized = entries.map((x) =>
      x.dayType !== "Work" ? { ...x, start: "", end: "", breakMins: 0 } : x
    );

    const computed = computeWeeklyTotals(normalized);

    const next = [
      {
        id: uid(),
        employeeId: me.employeeId,
        employeeName: me.name,
        weekStart,
        entries: normalized,
        totalHours: computed.total,
        regularHours: computed.regular,
        overtimeHours: computed.overtime,
        status: "Pending",
        createdAt: new Date().toISOString(),
      },
      ...all,
    ];

    lsWrite(SS_KEYS.WEEKLY_TIMESHEETS, next);
    setOk("✅ Weekly timesheet submitted for owner approval.");
  };

  if (!me?.employeeId) {
    return (
      <div className="ep-page">
        <div className="ep-shell">
          <main className="ep-glass ep-fade-in">
            <header className="ep-topbar">
              <div className="ep-title">
                <h1>Weekly Timesheet</h1>
                <p>Session not found. Please login again.</p>
              </div>
            </header>
            <section className="ep-content">
              <div className="ep-alert error">Cannot read employee profile. Please login again.</div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <button className="ep-btn ep-btn-primary" onClick={() => navigate("/employee-login")}>
                  Go to Employee Login
                </button>
                <Link className="ep-btn ep-btn-outline" to="/">
                  Home
                </Link>
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
            <div className="ep-title">
              <h1>Weekly Timesheet</h1>
              <p>Fill Mon–Sun. Non-work days submit 0 hours.</p>
            </div>
            <div className="ep-actions">
              <Link className="ep-btn ep-btn-outline" to="/employee-dashboard">
                ← Dashboard
              </Link>
            </div>
          </header>

          <section className="ep-content">
            <div className="ep-grid-2">
              <div className="ep-card">
                <div className="ep-kicker">
                  <h2>Fill week</h2>
                  <div className="ep-mini">
                    {me.name} • {me.employeeId}
                  </div>
                </div>

                <div className="ep-divider" />

                <form className="ep-form" onSubmit={submit}>
                  <div>
                    <label>Week starting (Monday)</label>
                    <input className="ep-input" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
                  </div>

                  <div className="ep-card" style={{ padding: 12 }}>
                    <div className="ep-kicker" style={{ marginBottom: 0 }}>
                      <h2>Totals</h2>
                      <div className="ep-mini">Auto-calculated</div>
                    </div>
                    <div className="ep-divider" />
                    <div className="ep-badges">
                      <span className="ep-badge blue">Total: {totals.total.toFixed(2)}h</span>
                      <span className="ep-badge green">Regular: {totals.regular.toFixed(2)}h</span>
                      <span className="ep-badge amber">OT: {totals.overtime.toFixed(2)}h</span>
                    </div>
                  </div>

                  <div className="ep-table-wrap" style={{ marginTop: 10 }}>
                    <table className="ep-table">
                      <thead>
                        <tr>
                          <th>Day</th>
                          <th>Type</th>
                          <th>Start</th>
                          <th>End</th>
                          <th>Break</th>
                          <th>Hours</th>
                          <th>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((en, idx) => {
                          const disabled = en.dayType !== "Work";
                          const dayHours = safeEntryHours(en);

                          return (
                            <tr key={en.day}>
                              <td style={{ fontWeight: 950 }}>{en.day}</td>
                              <td>
                                <select className="ep-input" value={en.dayType} onChange={(e) => update(idx, { dayType: e.target.value })}>
                                  {DAY_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td>
                                <input className="ep-input" type="time" value={en.start} disabled={disabled} onChange={(e) => update(idx, { start: e.target.value })} />
                              </td>
                              <td>
                                <input className="ep-input" type="time" value={en.end} disabled={disabled} onChange={(e) => update(idx, { end: e.target.value })} />
                              </td>
                              <td>
                                <input
                                  className="ep-input"
                                  type="number"
                                  min="0"
                                  step="5"
                                  value={en.breakMins}
                                  disabled={disabled}
                                  onChange={(e) => update(idx, { breakMins: Number(e.target.value || 0) })}
                                />
                              </td>
                              <td style={{ fontWeight: 900 }}>{dayHours.toFixed(2)}</td>
                              <td>
                                <input className="ep-input" value={en.notes} onChange={(e) => update(idx, { notes: e.target.value })} placeholder="Optional…" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {err && <div className="ep-alert error">{err}</div>}
                  {ok && <div className="ep-alert success">{ok}</div>}

                  <button className="ep-btn ep-btn-primary">Submit weekly timesheet</button>
                </form>
              </div>

              <div className="ep-card">
                <div className="ep-kicker">
                  <h2>My submissions</h2>
                  <div className="ep-mini">{mySubmissions.length} total</div>
                </div>

                <div className="ep-divider" />

                {mySubmissions.length === 0 ? (
                  <div className="ep-empty">No submissions yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {mySubmissions.map((t) => (
                      <div key={t.id} className="ep-card" style={{ padding: 12 }}>
                        <div className="ep-kicker">
                          <h2 style={{ margin: 0 }}>Week of {t.weekStart}</h2>
                          <div className="ep-mini">{new Date(t.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="ep-divider" />
                        <div className="ep-badges">
                          <span className="ep-badge blue">{Number(t.totalHours || 0).toFixed(2)}h total</span>
                          <span className="ep-badge green">{Number(t.regularHours || 0).toFixed(2)}h regular</span>
                          <span className="ep-badge amber">{Number(t.overtimeHours || 0).toFixed(2)}h OT</span>
                          <span className={`ep-badge ${String(t.status).toLowerCase().includes("accept") ? "green" : String(t.status).toLowerCase().includes("reject") ? "red" : "amber"}`}>
                            {t.status || "Pending"}
                          </span>
                        </div>
                      </div>
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
