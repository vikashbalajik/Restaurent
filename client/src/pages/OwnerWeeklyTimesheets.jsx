import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/ownerPages.css";
import {
  lsRead,
  lsWrite,
  SS_KEYS,
  startOfWeekMon,
  monthKey,
  yearKey,
  dateFromWeekStart,
  computeEntryHours,
  computeWeeklyTotals,
  yyyyMmDd,
  calcMonthOvertime,
  calcYearOvertime,
} from "../utils/ssStore";
import { SS_KEYS_EXT, dayOrder } from "../utils/ssStore";

const MIN_WEEK_HOURS = 20;
const REG_WEEK_CAP = 40;
const OT_MONTH_CAP = 25;
const OT_YEAR_CAP = 250;

export default function OwnerWeeklyTimesheets() {
  const [ts, setTs] = useState(() => lsRead(SS_KEYS_EXT.WEEKLY_TIMESHEETS, []));
  const [employees] = useState(() => lsRead(SS_KEYS.EMPLOYEES, []));
  const [shifts] = useState(() => lsRead(SS_KEYS.SHIFTS, []));

  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedTsId, setSelectedTsId] = useState("");
  const [ok, setOk] = useState("");

  const reload = () => {
    setTs(lsRead(SS_KEYS_EXT.WEEKLY_TIMESHEETS, []));
    setOk("");
  };

  const empList = useMemo(() => {
    const byEmp = {};
    for (const t of ts) {
      byEmp[t.employeeId] = byEmp[t.employeeId] || { employeeId: t.employeeId, employeeName: t.employeeName, pending: 0, total: 0 };
      byEmp[t.employeeId].total += 1;
      if (t.status === "Pending") byEmp[t.employeeId].pending += 1;
    }
    return Object.values(byEmp).sort((a, b) => b.pending - a.pending || a.employeeName.localeCompare(b.employeeName));
  }, [ts]);

  const selectedEmpTimesheets = useMemo(() => {
    if (!selectedEmpId) return [];
    return ts
      .filter((t) => t.employeeId === selectedEmpId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [ts, selectedEmpId]);

  const selected = useMemo(() => {
    if (!selectedTsId) return null;
    return ts.find((x) => x.id === selectedTsId) || null;
  }, [ts, selectedTsId]);

  const scheduleForSelectedWeek = useMemo(() => {
    if (!selected) return [];
    const ws = selected.weekStart;
    const weekDates = dayOrder.map((d) => dateFromWeekStart(ws, d));
    return shifts.filter((s) => s.employeeId === selected.employeeId && weekDates.includes(s.date));
  }, [selected, shifts]);

  const scheduleByDay = useMemo(() => {
    const map = {};
    for (const s of scheduleForSelectedWeek) {
      const day = dayOrder.find((d) => dateFromWeekStart(selected.weekStart, d) === s.date);
      if (!day) continue;
      map[day] = map[day] || [];
      map[day].push(s);
    }
    return map;
  }, [scheduleForSelectedWeek, selected]);

  const tsByDay = useMemo(() => {
    if (!selected) return {};
    const map = {};
    for (const e of selected.entries) map[e.day] = e;
    return map;
  }, [selected]);

  const insights = useMemo(() => {
    if (!selected) return null;
    const totals = computeWeeklyTotals(selected.entries);
    const total = totals.total;
    const overtime = totals.overtime;
    const regular = totals.regular;

    const underMin = total < MIN_WEEK_HOURS;
    const above40 = total > REG_WEEK_CAP;

    const missingScheduledDays = [];
    const extraWorkedNoSchedule = [];

    for (const day of dayOrder) {
      const hasShift = (scheduleByDay[day] || []).length > 0;
      const h = computeEntryHours(tsByDay[day] || {});
      if (hasShift && h === 0) missingScheduledDays.push(day);
      if (!hasShift && h > 0) extraWorkedNoSchedule.push(day);
    }

    const mOT = calcMonthOvertime(selected.employeeId, monthKey(selected.weekStart));
    const yOT = calcYearOvertime(selected.employeeId, yearKey(selected.weekStart));

    return {
      total, regular, overtime,
      underMin, above40,
      missingScheduledDays, extraWorkedNoSchedule,
      monthOT: mOT, yearOT: yOT,
    };
  }, [selected, scheduleByDay, tsByDay]);

  const approve = (id) => {
    const list = lsRead(SS_KEYS_EXT.WEEKLY_TIMESHEETS, []);
    const t = list.find((x) => x.id === id);
    if (!t) return;

    const totals = computeWeeklyTotals(t.entries);
    const addedOT = totals.overtime; // weekly OT from this sheet (simple model)

    const currentMonthOT = calcMonthOvertime(t.employeeId, monthKey(t.weekStart));
    const currentYearOT = calcYearOvertime(t.employeeId, yearKey(t.weekStart));

    if (currentMonthOT + addedOT > OT_MONTH_CAP) {
      alert("Cannot approve: overtime would exceed 25 hours this month.");
      return;
    }
    if (currentYearOT + addedOT > OT_YEAR_CAP) {
      alert("Cannot approve: overtime would exceed 250 hours this year.");
      return;
    }

    const next = list.map((x) =>
      x.id === id ? { ...x, status: "Accepted", decidedAt: new Date().toISOString() } : x
    );
    lsWrite(SS_KEYS_EXT.WEEKLY_TIMESHEETS, next);
    setTs(next);
    setOk("✅ Timesheet accepted.");
  };

  const reject = (id) => {
    const list = lsRead(SS_KEYS_EXT.WEEKLY_TIMESHEETS, []);
    const next = list.map((x) =>
      x.id === id ? { ...x, status: "Rejected", decidedAt: new Date().toISOString() } : x
    );
    lsWrite(SS_KEYS_EXT.WEEKLY_TIMESHEETS, next);
    setTs(next);
    setOk("❌ Timesheet rejected.");
  };

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-title">
              <h1>Timesheets</h1>
              <p>Click an employee → compare submitted week vs scheduled shifts → approve/reject.</p>
            </div>
            <div className="op-actions">
              <button className="op-btn op-btn-outline" onClick={reload}>↻ Refresh</button>
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">← Dashboard</Link>
            </div>
          </header>

          <section className="op-content">
            {ok && <div className="op-alert success" style={{ marginBottom: 12 }}>{ok}</div>}

            <div className="op-row" style={{ alignItems: "stretch" }}>
              {/* LEFT: Employee list */}
              <div className="op-card" style={{ flex: 1, minWidth: 320 }}>
                <h2>Employees</h2>
                {empList.length === 0 ? (
                  <div className="op-empty">No timesheets submitted yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {empList.map((e) => (
                      <button
                        key={e.employeeId}
                        className={`op-btn ${selectedEmpId === e.employeeId ? "op-btn-primary" : "op-btn-outline"}`}
                        style={{ justifyContent: "space-between" }}
                        onClick={() => {
                          setSelectedEmpId(e.employeeId);
                          setSelectedTsId("");
                          setOk("");
                        }}
                      >
                        <span style={{ fontWeight: 900 }}>{e.employeeName}</span>
                        <span style={{ display: "flex", gap: 8 }}>
                          <span className="op-badge amber">Pending: {e.pending}</span>
                          <span className="op-badge blue">Total: {e.total}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* MIDDLE: Timesheets for selected employee */}
              <div className="op-card" style={{ flex: 1.2, minWidth: 360 }}>
                <h2>Submitted weeks</h2>

                {!selectedEmpId ? (
                  <div className="op-empty">Select an employee to view their weekly timesheets.</div>
                ) : selectedEmpTimesheets.length === 0 ? (
                  <div className="op-empty">No submissions for this employee.</div>
                ) : (
                  <div className="op-table-wrap">
                    <table className="op-table">
                      <thead>
                        <tr>
                          <th>Week</th>
                          <th>Total</th>
                          <th>OT</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEmpTimesheets.map((t) => (
                          <tr
                            key={t.id}
                            style={{ cursor: "pointer", background: selectedTsId === t.id ? "rgba(59,130,246,0.08)" : "transparent" }}
                            onClick={() => setSelectedTsId(t.id)}
                          >
                            <td style={{ fontWeight: 900 }}>{new Date(t.weekStart).toLocaleDateString()}</td>
                            <td>{t.totalHours} hrs</td>
                            <td>{t.overtimeHours} hrs</td>
                            <td>
                              <span className={`op-badge ${t.status === "Accepted" ? "green" : t.status === "Rejected" ? "red" : "amber"}`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* RIGHT: Compare view */}
              <div className="op-card" style={{ flex: 2, minWidth: 520 }}>
                <h2>Compare: Timesheet vs Schedule</h2>

                {!selected ? (
                  <div className="op-empty">Select a submitted week to review.</div>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      <span className="op-badge blue">Week: {new Date(selected.weekStart).toLocaleDateString()}</span>
                      <span className="op-badge green">Regular: {insights.regular.toFixed(2)} hrs</span>
                      <span className="op-badge amber">OT: {insights.overtime.toFixed(2)} hrs</span>
                      <span className={`op-badge ${insights.underMin ? "red" : "green"}`}>
                        {insights.underMin ? `Under ${MIN_WEEK_HOURS} hrs` : `Meets min ${MIN_WEEK_HOURS}`}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      <span className="op-badge amber">Month OT used: {insights.monthOT.toFixed(2)} / {OT_MONTH_CAP}</span>
                      <span className="op-badge amber">Year OT used: {insights.yearOT.toFixed(2)} / {OT_YEAR_CAP}</span>
                    </div>

                    {(insights.missingScheduledDays.length > 0 || insights.extraWorkedNoSchedule.length > 0) && (
                      <div className="op-alert" style={{ borderColor: "#f59e0b" }}>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>Schedule mismatch:</div>
                        {insights.missingScheduledDays.length > 0 && (
                          <div>• Scheduled but 0 hours: <b>{insights.missingScheduledDays.join(", ")}</b></div>
                        )}
                        {insights.extraWorkedNoSchedule.length > 0 && (
                          <div>• Worked but no shift: <b>{insights.extraWorkedNoSchedule.join(", ")}</b></div>
                        )}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10 }}>
                      <div className="op-card" style={{ margin: 0 }}>
                        <h2 style={{ marginBottom: 8 }}>Submitted Timesheet</h2>
                        <div className="op-table-wrap">
                          <table className="op-table">
                            <thead>
                              <tr>
                                <th>Day</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Break</th>
                                <th>Hours</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selected.entries.map((e) => (
                                <tr key={e.day}>
                                  <td style={{ fontWeight: 900 }}>{e.day}</td>
                                  <td>{e.start}</td>
                                  <td>{e.end}</td>
                                  <td>{e.breakMins}m</td>
                                  <td>{computeEntryHours(e).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="op-card" style={{ margin: 0 }}>
                        <h2 style={{ marginBottom: 8 }}>Scheduled Shifts</h2>
                        <div className="op-table-wrap">
                          <table className="op-table">
                            <thead>
                              <tr>
                                <th>Day</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Role</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayOrder.map((d) => {
                                const date = dateFromWeekStart(selected.weekStart, d);
                                const list = (scheduleByDay[d] || []);
                                if (list.length === 0) {
                                  return (
                                    <tr key={d}>
                                      <td style={{ fontWeight: 900 }}>{d}</td>
                                      <td>{new Date(date).toLocaleDateString()}</td>
                                      <td colSpan={2} style={{ color: "var(--op-muted)", fontWeight: 800 }}>
                                        No shift
                                      </td>
                                    </tr>
                                  );
                                }
                                return list.map((s, idx) => (
                                  <tr key={`${d}_${idx}`}>
                                    <td style={{ fontWeight: 900 }}>{d}</td>
                                    <td>{new Date(s.date).toLocaleDateString()}</td>
                                    <td>{s.start} — {s.end}</td>
                                    <td>{s.role}</td>
                                  </tr>
                                ));
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                      <button
                        className="op-btn op-btn-primary"
                        onClick={() => approve(selected.id)}
                        disabled={selected.status === "Accepted"}
                      >
                        Accept
                      </button>
                      <button
                        className="op-btn op-btn-danger"
                        onClick={() => reject(selected.id)}
                        disabled={selected.status === "Rejected"}
                      >
                        Reject
                      </button>
                      {selected.decidedAt && (
                        <span style={{ color: "var(--op-muted)", fontWeight: 900 }}>
                          Decided: {new Date(selected.decidedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}
