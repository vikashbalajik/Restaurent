// src/pages/OwnerLeaveRequests.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/ownerPages.css";
import {
  SS_KEYS,
  lsRead,
  lsWrite,
  getLeaveBalance,
  countLeaveDaysInclusive,
  monthKey,
} from "../utils/ssStore";

export default function OwnerLeaveRequests() {
  const [tab, setTab] = useState("Pending");
  const [q, setQ] = useState("");
  const [ok, setOk] = useState("");

  const [rows, setRows] = useState(() => lsRead(SS_KEYS.LEAVE_REQUESTS, []));

  const reload = () => setRows(lsRead(SS_KEYS.LEAVE_REQUESTS, []));

  const decide = (id, status) => {
    setOk("");
    const list = lsRead(SS_KEYS.LEAVE_REQUESTS, []);
    const next = list.map((r) =>
      r.id === id ? { ...r, status, decidedAt: new Date().toISOString() } : r
    );
    lsWrite(SS_KEYS.LEAVE_REQUESTS, next);
    reload();
    setOk(`Leave request ${status}.`);
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows
      .filter((r) => (tab === "All" ? true : r.status === tab))
      .filter((r) => {
        if (!query) return true;
        return (
          String(r.employeeName || "").toLowerCase().includes(query) ||
          String(r.employeeId || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows, tab, q]);

  const counts = useMemo(() => {
    const c = { Pending: 0, Accepted: 0, Rejected: 0, All: rows.length };
    rows.forEach((r) => c[r.status] !== undefined && (c[r.status] += 1));
    return c;
  }, [rows]);

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-title">
              <h1>Leave Requests</h1>
              <p>Approve or reject employee leave requests.</p>
            </div>

            <div className="op-actions">
              <button className="op-btn op-btn-outline" onClick={reload}>↻ Refresh</button>
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">← Dashboard</Link>
            </div>
          </header>

          <section className="op-content">
            {ok && <div className="op-alert success">{ok}</div>}

            <div className="op-row">
              <div className="op-card">
                <h2>Filters</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["Pending", "Accepted", "Rejected", "All"].map((t) => (
                    <button
                      key={t}
                      className={`op-btn ${tab === t ? "op-btn-primary" : "op-btn-outline"}`}
                      onClick={() => setTab(t)}
                      type="button"
                    >
                      {t} ({counts[t] ?? 0})
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <label>Search</label>
                  <input className="op-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="name / employeeId" />
                </div>
              </div>

              <div className="op-card">
                <h2>Summary</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span className="op-badge amber">Pending: {counts.Pending}</span>
                  <span className="op-badge green">Accepted: {counts.Accepted}</span>
                  <span className="op-badge red">Rejected: {counts.Rejected}</span>
                </div>
                <div className="op-empty" style={{ marginTop: 10 }}>
                  Balance is per-month (default 3 days/month).
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {filtered.length === 0 ? (
                <div className="op-empty">No leave requests found.</div>
              ) : (
                <div className="op-table-wrap">
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Days</th>
                        <th>Balance (month)</th>
                        <th>Reason</th>
                        <th>Status</th>
                        <th style={{ width: 240 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r) => {
                        const days = countLeaveDaysInclusive(r.from, r.to);
                        const bal = getLeaveBalance(r.employeeId, r.from, 3);
                        const month = monthKey(r.from);

                        return (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 900 }}>
                              {r.employeeName}
                              <div style={{ color: "var(--op-muted)", fontWeight: 800, fontSize: 12 }}>
                                {r.employeeId}
                              </div>
                            </td>
                            <td>{new Date(r.from).toLocaleDateString()}</td>
                            <td>{new Date(r.to).toLocaleDateString()}</td>
                            <td><span className="op-badge blue">{days}</span></td>

                            <td>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <span className="op-badge green">Allowed: {bal.allowed}</span>
                                <span className="op-badge amber">Used: {bal.used}</span>
                                <span className={`op-badge ${bal.remaining === 0 ? "red" : "blue"}`}>
                                  Remaining: {bal.remaining}
                                </span>
                              </div>
                              <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: "var(--op-muted)" }}>
                                Month: {month}
                              </div>
                            </td>

                            <td style={{ maxWidth: 360, whiteSpace: "pre-wrap" }}>{r.reason}</td>
                            <td><span className={`op-badge ${r.status === "Accepted" ? "green" : r.status === "Rejected" ? "red" : "amber"}`}>{r.status}</span></td>

                            <td>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                  className="op-btn op-btn-primary"
                                  onClick={() => decide(r.id, "Accepted")}
                                  disabled={r.status === "Accepted"}
                                  title={bal.remaining === 0 ? "No remaining leaves this month" : ""}
                                >
                                  Accept
                                </button>
                                <button
                                  className="op-btn op-btn-danger"
                                  onClick={() => decide(r.id, "Rejected")}
                                  disabled={r.status === "Rejected"}
                                >
                                  Reject
                                </button>
                              </div>

                              {r.decidedAt && (
                                <div style={{ marginTop: 6, color: "var(--op-muted)", fontWeight: 800, fontSize: 12 }}>
                                  Decided: {new Date(r.decidedAt).toLocaleString()}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}
