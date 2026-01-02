// client/src/pages/employee/EmployeeAnnouncements.jsx
import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import "../../styles/employeePages.css";
import { SS_KEYS, lsReadArray, getEmpProfile, yyyyMmDd, dateToDayShort } from "../../utils/ssStore";

export default function EmployeeAnnouncements() {
  const me = getEmpProfile();
  const today = yyyyMmDd(new Date());
  const todayDay = dateToDayShort(today);

  const shifts = useMemo(() => lsReadArray(SS_KEYS.SHIFTS), []);
  const myShiftsToday = useMemo(() => {
    if (!me?.employeeId) return [];
    return shifts.filter((s) => s.employeeId === me.employeeId && s.date === today);
  }, [shifts, me?.employeeId, today]);

  const myRoleToday = myShiftsToday[0]?.role || me?.role || "Employee";

  // ✅ always array-safe
  const all = useMemo(() => lsReadArray(SS_KEYS.OWNER_ANNOUNCEMENTS), []);

  const visible = useMemo(() => {
    return all
      .filter((a) => {
        const t = a.target || { type: "ALL" };
        if (t.type === "ALL") return true;
        if (t.type === "ROLE") return Array.isArray(t.roles) && t.roles.includes(myRoleToday);
        if (t.type === "DAY") return t.day === todayDay;
        if (t.type === "DATE") return t.date === today;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [all, myRoleToday, todayDay, today]);

  return (
    <div className="ep-page">
      <div className="ep-shell">
        <main className="ep-glass ep-fade-in">
          <header className="ep-topbar">
            <div className="ep-title">
              <h1>Announcements</h1>
              <p>
                Today ({todayDay}) • Role: <b>{myRoleToday}</b>
              </p>
            </div>
            <div className="ep-actions">
              <Link className="ep-btn ep-btn-outline" to="/employee-dashboard">
                ← Dashboard
              </Link>
            </div>
          </header>

          <section className="ep-content">
            {visible.length === 0 ? (
              <div className="ep-empty">No announcements for today.</div>
            ) : (
              <div className="ep-grid-2">
                {visible.map((a) => (
                  <article key={a.id} className="ep-card">
                    <div className="ep-kicker">
                      <h2 style={{ margin: 0 }}>{a.title || "Announcement"}</h2>
                      <div className="ep-mini">{a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}</div>
                    </div>
                    <div className="ep-divider" />
                    <div style={{ fontWeight: 800, whiteSpace: "pre-wrap" }}>{a.message}</div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
