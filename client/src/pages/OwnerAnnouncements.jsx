import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/ownerPages.css";
import { SS_KEYS, lsRead, lsWrite, uid } from "../utils/ssStore";

const roles = ["All", "Cashier", "Server", "Chef", "Manager", "Host"];
const days = ["All", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function OwnerAnnouncements() {
  const [items, setItems] = useState(() => lsRead(SS_KEYS.OWNER_ANNOUNCEMENTS, []));
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [targetType, setTargetType] = useState("ALL"); // ALL | ROLE | DAY
  const [targetRole, setTargetRole] = useState("Cashier");
  const [targetDay, setTargetDay] = useState("Mon");

  const targetLabel = useMemo(() => {
    if (targetType === "ALL") return "All employees";
    if (targetType === "ROLE") return `Role: ${targetRole}`;
    return `Day: ${targetDay}`;
  }, [targetType, targetRole, targetDay]);

  const post = (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const target =
      targetType === "ALL"
        ? { type: "ALL" }
        : targetType === "ROLE"
        ? { type: "ROLE", roles: [targetRole] }
        : { type: "DAY", day: targetDay };

    const next = [
      {
        id: uid(),
        title: title.trim() || "Announcement",
        message: message.trim(),
        target,
        createdAt: new Date().toISOString(),
      },
      ...items,
    ];

    setItems(next);
    lsWrite(SS_KEYS.OWNER_ANNOUNCEMENTS, next);
    setTitle("");
    setMessage("");
  };

  const remove = (id) => {
    const next = items.filter(a => a.id !== id);
    setItems(next);
    lsWrite(SS_KEYS.OWNER_ANNOUNCEMENTS, next);
  };

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-brand">
              <img src={logo} alt="SS"/>
              <div className="op-title">
                <h1>Announcements</h1>
                <p>Send group announcements (All / by Role / by Day).</p>
              </div>
            </div>
            <div className="op-actions">
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">← Dashboard</Link>
            </div>
          </header>

          <section className="op-content">
            <div className="op-row">
              <div className="op-card">
                <h2>Create announcement</h2>

                <div className="op-row">
                  <div>
                    <label>Audience type</label>
                    <select className="op-select" value={targetType} onChange={(e)=>setTargetType(e.target.value)}>
                      <option value="ALL">All employees</option>
                      <option value="ROLE">By role</option>
                      <option value="DAY">By day</option>
                    </select>
                  </div>

                  {targetType === "ROLE" && (
                    <div>
                      <label>Role</label>
                      <select className="op-select" value={targetRole} onChange={(e)=>setTargetRole(e.target.value)}>
                        {roles.filter(r=>r!=="All").map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  )}

                  {targetType === "DAY" && (
                    <div>
                      <label>Day</label>
                      <select className="op-select" value={targetDay} onChange={(e)=>setTargetDay(e.target.value)}>
                        {days.filter(d=>d!=="All").map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <form className="op-form" onSubmit={post}>
                  <div>
                    <label>Title</label>
                    <input className="op-input" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="e.g., Shift update"/>
                  </div>
                  <div>
                    <label>Message</label>
                    <textarea className="op-textarea" value={message} onChange={(e)=>setMessage(e.target.value)} />
                  </div>

                  <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                    <span className="op-badge blue">Target: {targetLabel}</span>
                    <button className="op-btn op-btn-primary">Post</button>
                  </div>
                </form>
              </div>

              <div className="op-card">
                <h2>Recent announcements</h2>

                {items.length === 0 ? (
                  <div className="op-empty">No announcements yet.</div>
                ) : (
                  <div className="op-table-wrap">
                    <table className="op-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Target</th>
                          <th>Message</th>
                          <th>Created</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(a => (
                          <tr key={a.id}>
                            <td style={{ fontWeight:900 }}>{a.title}</td>
                            <td>
                              <span className="op-badge amber">
                                {a.target?.type === "ALL" ? "All" : a.target?.type === "ROLE" ? `Role: ${a.target.roles?.join(",")}` : `Day: ${a.target.day}`}
                              </span>
                            </td>
                            <td style={{ maxWidth: 520, whiteSpace:"pre-wrap" }}>{a.message}</td>
                            <td>{new Date(a.createdAt).toLocaleString()}</td>
                            <td>
                              <button className="op-btn op-btn-danger" onClick={() => remove(a.id)}>Delete</button>
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
