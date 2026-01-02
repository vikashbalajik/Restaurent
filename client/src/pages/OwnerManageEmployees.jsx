import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/ownerPages.css";
import { SS_KEYS, lsReadArray, subscribeKey, getEmployeeStatus, setEmployeeStatus } from "../utils/ssStore";

export default function OwnerManageEmployees() {
  const [employees, setEmployees] = useState(() => lsReadArray(SS_KEYS.EMPLOYEES));
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("Active"); // Active | Inactive | All
  const [toast, setToast] = useState("");

  useEffect(() => {
    const refresh = () => setEmployees(lsReadArray(SS_KEYS.EMPLOYEES));
    refresh();
    const unsub = subscribeKey(SS_KEYS.EMPLOYEES, refresh);
    const unsub2 = subscribeKey(SS_KEYS.EMP_STATUS, refresh); // re-render when status map changes
    return () => {
      unsub?.();
      unsub2?.();
    };
  }, []);

  const enriched = useMemo(() => {
    return employees.map((e) => ({
      ...e,
      __status: getEmployeeStatus(e.employeeId),
    }));
  }, [employees]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return enriched
      .filter((e) => {
        if (tab === "Active") return e.__status !== "Inactive";
        if (tab === "Inactive") return e.__status === "Inactive";
        return true;
      })
      .filter((e) => {
        if (!needle) return true;
        return (
          String(e.name || "").toLowerCase().includes(needle) ||
          String(e.employeeId || "").toLowerCase().includes(needle) ||
          String(e.email || "").toLowerCase().includes(needle) ||
          String(e.mobile || "").toLowerCase().includes(needle) ||
          String(e.role || "").toLowerCase().includes(needle) ||
          String(e.section || "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [enriched, q, tab]);

  const counts = useMemo(() => {
    const all = enriched.length;
    const inactive = enriched.filter((e) => e.__status === "Inactive").length;
    const active = all - inactive;
    return { all, active, inactive };
  }, [enriched]);

  const confirmDeactivate = (e) => {
    const ok = window.confirm(
      `Deactivate ${e.name || "this employee"}?\n\nThis will NOT delete any data. You can reactivate later.`
    );
    if (!ok) return;
    setEmployeeStatus(e.employeeId, "Inactive");
    setToast(`✅ ${e.name || e.employeeId} deactivated`);
    window.clearTimeout(window.__ss_owner_emp_toast);
    window.__ss_owner_emp_toast = window.setTimeout(() => setToast(""), 2200);
  };

  const reactivate = (e) => {
    setEmployeeStatus(e.employeeId, "Active");
    setToast(`✅ ${e.name || e.employeeId} reactivated`);
    window.clearTimeout(window.__ss_owner_emp_toast);
    window.__ss_owner_emp_toast = window.setTimeout(() => setToast(""), 2200);
  };

  const badgeCls = (s) => (s === "Inactive" ? "red" : "green");

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-brand">
              <img src={logo} alt="SS" />
              <div className="op-title">
                <h1>Manage Employees</h1>
                <p>Deactivate/reactivate accounts. Data stays محفوظ (safe) forever.</p>
              </div>
            </div>
            <div className="op-actions">
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">
                ← Dashboard
              </Link>
            </div>
          </header>

          <section className="op-content">
            {toast && <div className="op-alert success" style={{ marginBottom: 12 }}>{toast}</div>}

            <div className="op-row" style={{ alignItems: "stretch" }}>
              <div className="op-card">
                <h2>Overview</h2>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <span className="op-badge blue">All: {counts.all}</span>
                  <span className="op-badge green">Active: {counts.active}</span>
                  <span className="op-badge red">Inactive: {counts.inactive}</span>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label>Search</label>
                  <input
                    className="op-input"
                    placeholder="name / employeeId / role / section / email / mobile…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {["Active", "Inactive", "All"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`op-btn ${tab === t ? "op-btn-primary" : "op-btn-outline"}`}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 12 }} className="op-empty">
                  Tip: Use <b>Inactive</b> for quits/terminations — it prevents access while keeping history.
                </div>
              </div>

              <div className="op-card" style={{ flex: 1.6 }}>
                <h2>Employees</h2>

                {filtered.length === 0 ? (
                  <div className="op-empty">No employees match your filters.</div>
                ) : (
                  <div className="op-table-wrap">
                    <table className="op-table">
                      <thead>
                        <tr>
                          <th>Employee</th>
                          <th>Role</th>
                          <th>Section</th>
                          <th>Status</th>
                          <th style={{ width: 220 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((e) => (
                          <tr key={e.employeeId}>
                            <td style={{ fontWeight: 900 }}>
                              {e.name || "—"}
                              <div style={{ color: "var(--op-muted)", fontWeight: 800, fontSize: 12 }}>
                                {e.employeeId || "—"} {e.email ? `• ${e.email}` : ""} {e.mobile ? `• ${e.mobile}` : ""}
                              </div>
                            </td>
                            <td>{e.role || "—"}</td>
                            <td>{e.section || "—"}</td>
                            <td>
                              <span className={`op-badge ${badgeCls(e.__status)}`}>
                                {e.__status}
                              </span>
                            </td>
                            <td>
                              {e.__status === "Inactive" ? (
                                <button className="op-btn op-btn-outline" type="button" onClick={() => reactivate(e)}>
                                  Reactivate
                                </button>
                              ) : (
                                <button className="op-btn op-btn-danger" type="button" onClick={() => confirmDeactivate(e)}>
                                  Deactivate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
