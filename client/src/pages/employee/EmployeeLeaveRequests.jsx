// client/src/pages/employee/EmployeeLeaveRequests.jsx
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "../../styles/employeePages.css";
import { SS_KEYS, lsReadArray, lsWrite, uid, getEmpProfile } from "../../utils/ssStore";

export default function EmployeeLeaveRequests() {
  const navigate = useNavigate();
  const me = getEmpProfile();

  const employeeId = me?.employeeId || "";
  const employeeName = me?.name || "Employee";

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const mine = useMemo(() => {
    if (!employeeId) return [];
    const list = lsReadArray(SS_KEYS.LEAVE_REQUESTS);
    return list
      .filter((r) => String(r.employeeId) === String(employeeId))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [employeeId, ok]);

  const submit = (e) => {
    e.preventDefault();
    setOk("");
    setErr("");

    if (!employeeId) return setErr("Session missing. Please login again.");
    if (!from || !to) return setErr("Please choose From and To dates.");
    if (new Date(to) < new Date(from)) return setErr("To date cannot be before From date.");
    if (!reason.trim()) return setErr("Please enter a reason.");

    const list = lsReadArray(SS_KEYS.LEAVE_REQUESTS);
    const next = [
      {
        id: uid(),
        employeeId,
        employeeName,
        from,
        to,
        reason: reason.trim(),
        status: "Pending",
        createdAt: new Date().toISOString(),
      },
      ...list,
    ];
    lsWrite(SS_KEYS.LEAVE_REQUESTS, next);

    setFrom("");
    setTo("");
    setReason("");
    setOk("✅ Leave request sent. Waiting for owner approval.");
  };

  const badgeClass = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("accept") || s.includes("approve")) return "green";
    if (s.includes("reject")) return "red";
    if (s.includes("pend")) return "amber";
    return "blue";
  };

  if (!me?.employeeId) {
    return (
      <div className="ep-page">
        <div className="ep-shell">
          <main className="ep-glass ep-fade-in">
            <header className="ep-topbar">
              <div className="ep-title">
                <h1>Leave Requests</h1>
                <p>Session expired. Please login again.</p>
              </div>
              <div className="ep-actions">
                <button className="ep-btn ep-btn-primary" onClick={() => navigate("/employee-login")}>
                  Go to Employee Login
                </button>
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

  return (
    <div className="ep-page">
      <div className="ep-shell">
        <main className="ep-glass ep-fade-in">
          <header className="ep-topbar">
            <div className="ep-brand">
              <img src={logo} alt="SS" />
              <div className="ep-title">
                <h1>Leave Requests</h1>
                <p>Request time off. Owner approval required.</p>
              </div>
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
                  <h2>Request leave</h2>
                  <div className="ep-mini">
                    {employeeName} ({employeeId})
                  </div>
                </div>

                <div className="ep-divider" />

                <form className="ep-form" onSubmit={submit}>
                  <div className="ep-row">
                    <div>
                      <label>From</label>
                      <input className="ep-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                      <label>To</label>
                      <input className="ep-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label>Reason</label>
                    <textarea className="ep-textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain your request..." />
                  </div>

                  {err && <div className="ep-alert error">{err}</div>}
                  {ok && <div className="ep-alert success">{ok}</div>}

                  <button className="ep-btn ep-btn-primary">Send request</button>
                </form>
              </div>

              <div className="ep-card">
                <div className="ep-kicker">
                  <h2>My history</h2>
                  <div className="ep-mini">{mine.length} requests</div>
                </div>

                <div className="ep-divider" />

                {mine.length === 0 ? (
                  <div className="ep-empty">No leave requests yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {mine.map((r) => (
                      <div key={r.id} className="ep-card" style={{ padding: 12 }}>
                        <div className="ep-kicker">
                          <h2 style={{ margin: 0 }}>
                            {r.from} → {r.to}
                          </h2>
                          <div className="ep-mini">{new Date(r.createdAt).toLocaleString()}</div>
                        </div>
                        <div className="ep-divider" />
                        <div className="ep-badges">
                          <span className={`ep-badge ${badgeClass(r.status)}`}>{r.status || "Pending"}</span>
                          {r.reason ? <span className="ep-badge">{r.reason}</span> : null}
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
