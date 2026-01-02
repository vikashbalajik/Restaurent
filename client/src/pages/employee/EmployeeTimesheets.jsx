// src/pages/EmployeeWeeklyTimesheet.jsx
import React, { useMemo, useState } from "react";
import "../styles/customerPages.css"; // or your employee css if different
import {
  SS_KEYS,
  lsRead,
  lsReadArray,
  createTimesheetRequest,
  yyyyMmDd,
  startOfWeekMon,
  dateToPretty,
} from "../utils/ssStore";

export default function EmployeeWeeklyTimesheet() {
  // employee profile should be saved somewhere in your app on login
  const emp = lsRead(SS_KEYS.EMP_PROFILE, null);

  const employeeId =
    emp?.id || emp?._id || emp?.employeeId || emp?.empId || emp?.email || "";

  const employeeName =
    emp?.name || emp?.fullName || emp?.employeeName || emp?.email || "Employee";

  // ✅ IMPORTANT: always read via lsReadArray so ".filter" never crashes
  const all = lsReadArray(SS_KEYS.TIMESHEET_REQUESTS);

  const mine = useMemo(() => {
    return all.filter((r) => String(r?.employeeId || "") === String(employeeId));
  }, [all, employeeId]);

  const [weekStart, setWeekStart] = useState(yyyyMmDd(startOfWeekMon(new Date())));
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!employeeId) {
      alert("No employee profile found. Please login again.");
      return;
    }
    if (!hours || Number(hours) <= 0) {
      alert("Enter hours (greater than 0).");
      return;
    }

    createTimesheetRequest({
      employeeId,
      employeeName,
      weekStart,
      hours: Number(hours),
      notes,
    });

    setHours("");
    setNotes("");
    alert("Timesheet submitted!");
    // If you want it to re-render immediately without refresh, you can convert `all`
    // to state and reload it on submit — but this is enough to fix the crash.
  };

  return (
    <div className="cx-page">
      <div className="cx-shell">
        <div className="cx-header">
          <h1 className="cx-title">Weekly Timesheet</h1>
          <div className="cx-subtitle">
            Logged in as <b>{employeeName}</b>
          </div>
        </div>

        <div className="cx-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Submit */}
          <div className="cx-card">
            <div className="cx-card-head">
              <div>
                <div className="cx-card-title">Submit hours</div>
                <div className="cx-card-sub">Week starting (Mon)</div>
              </div>
            </div>

            <form onSubmit={submit} className="cx-form" style={{ marginTop: 12 }}>
              <label className="cx-label">
                Week start
                <input
                  className="cx-input"
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                />
              </label>

              <label className="cx-label" style={{ marginTop: 10 }}>
                Hours
                <input
                  className="cx-input"
                  type="number"
                  step="0.25"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g. 40"
                />
              </label>

              <label className="cx-label" style={{ marginTop: 10 }}>
                Notes (optional)
                <textarea
                  className="cx-input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything to mention..."
                />
              </label>

              <button className="cx-btn" type="submit" style={{ marginTop: 12 }}>
                Submit Timesheet
              </button>
            </form>
          </div>

          {/* History */}
          <div className="cx-card">
            <div className="cx-card-head">
              <div>
                <div className="cx-card-title">My submissions</div>
                <div className="cx-card-sub">Most recent first</div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {mine.length === 0 ? (
                <div className="cx-muted">No submissions yet.</div>
              ) : (
                mine.map((r) => (
                  <div
                    key={r.id}
                    className="cx-card"
                    style={{ padding: 12, borderRadius: 12 }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          Week of {dateToPretty(r.weekStart)}
                        </div>
                        <div className="cx-subtext">{Number(r.hours || 0)} hrs</div>
                        {r.notes ? <div className="cx-subtext">{r.notes}</div> : null}
                      </div>

                      <div style={{ textTransform: "capitalize" }}>
                        <span
                          className="cx-pill"
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.14)",
                          }}
                        >
                          {r.status || "pending"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Debug helper (optional) */}
        <div className="cx-muted" style={{ marginTop: 14 }}>
          Total stored requests: {all.length}
        </div>
      </div>
    </div>
  );
}
