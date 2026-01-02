import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/ownerPages.css";
import { SS_KEYS, lsRead, lsWrite } from "../utils/ssStore";

export default function OwnerTimesheets() {
  const [tab, setTab] = useState("Pending"); // Pending | Accepted | Rejected | All
  const [q, setQ] = useState("");
  const [ok, setOk] = useState("");

  const [rows, setRows] = useState(() => lsRead(SS_KEYS.TIMESHEET_REQUESTS, []));

  const reload = () => setRows(lsRead(SS_KEYS.TIMESHEET_REQUESTS, []));

  const decide = (id, status) => {
    setOk("");
    const list = lsRead(SS_KEYS.TIMESHEET_REQUESTS, []);
    const next = list.map((t) =>
      t.id === id ? { ...t, status, decidedAt: new Date().toISOString() } : t
    );
    lsWrite(SS_KEYS.TIMESHEET_REQUESTS, next);
    reload();
    setOk(`Timesheet ${status}.`);
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows
      .filter((t) => (tab === "All" ? true : t.status === tab))
      .filter((t) => {
        if (!query) return true;
        return (
          String(t.employeeName || "").toLowerCase().includes(query) ||
          String(t.employeeId || "").toLowerCase().includes(query) ||
          String(t.date || "").toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [rows, tab, q]);

  const counts = useMemo(() => {
    const c = { Pending: 0, Accepted: 0, Rejected: 0, All: rows.length };
    rows.forEach((t) => {
      if (c[t.status] !== undefined) c[t.status] += 1;
    });
    return c;
  }, [rows]);

  const badge = (s) => {
    const v = String(s).toLowerCase();
    if (v.includes("accept")) return "green";
    if (v.includes("reject")) return "red";
    if (v.includes("pend")) return "amber";
    return "blue";
  };

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-brand">
              <img src={logo} alt="SS" />
              <div className="op-title">
                <h1>Timesheets</h1>
                <p>Approve or reject employee hours. Approved hours feed reports.</p>
              </div>
            </div>

            <div className="op-actions">
              <button className="op-btn op-btn-outline" onClick={reload}>↻ Refresh</button>
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">← Dashboard</Link>
            </div>
          </header>

          <section className="op-content">
            {ok && <div className="op-alert success" style={{ marginBottom: 12 }}>{ok}</div>}

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
                  <label>Search (name / employeeId / date)</label>
                  <input className="op-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
                </div>
              </div>

              <div className="op-card">
                <h2>Summary</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span className="op-badge amber">Pending: {counts.Pending}</span>
                  <span className="op-badge green">Accepted: {counts.Accepted}</span>
                  <span className="op-badge red">Rejected: {counts.Rejected}</span>
                </div>
                <div style={{ marginTop: 10 }} className="op-empty">
                  Tip: Approving timesheets updates Owner Reports automatically.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              {filtered.length === 0 ? (
                <div className="op-empty">No timesheets found for this filter.</div>
              ) : (
                <div className="op-table-wrap">
                  <table className="op-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Date</th>
                        <th>Hours</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th style={{ width: 240 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr key={t.id}>
                          <td style={{ fontWeight: 900 }}>
                            {t.employeeName}
                            <div style={{ color: "var(--op-muted)", fontWeight: 800, fontSize: 12 }}>
                              {t.employeeId}
                            </div>
                          </td>
                          <td>{new Date(t.date).toLocaleDateString()}</td>
                          <td style={{ fontWeight: 900 }}>{t.hours}</td>
                          <td style={{ maxWidth: 420 }}>
                            {t.notes ? t.notes : <span style={{ color: "var(--op-muted-2)", fontWeight: 800 }}>—</span>}
                          </td>
                          <td>
                            <span className={`op-badge ${badge(t.status)}`}>{t.status}</span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <button
                                className="op-btn op-btn-primary"
                                onClick={() => decide(t.id, "Accepted")}
                                disabled={t.status === "Accepted"}
                              >
                                Accept
                              </button>
                              <button
                                className="op-btn op-btn-danger"
                                onClick={() => decide(t.id, "Rejected")}
                                disabled={t.status === "Rejected"}
                              >
                                Reject
                              </button>
                            </div>

                            {t.decidedAt && (
                              <div style={{ marginTop: 6, color: "var(--op-muted)", fontWeight: 800, fontSize: 12 }}>
                                Decided: {new Date(t.decidedAt).toLocaleString()}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
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
