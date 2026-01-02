import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/ownerPages.css";
import {
  SS_KEYS,
  lsReadArray,
  lsRead,
  lsWrite,
  subscribeKey,
  uid,
  getEmployeeStatus,
} from "../utils/ssStore";

const asArray = (v) => (Array.isArray(v) ? v : []);

export default function OwnerChat() {
  const [employees, setEmployees] = useState(() => lsReadArray(SS_KEYS.EMPLOYEES));
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  const [messages, setMessages] = useState(() => asArray(lsRead(SS_KEYS.OWNER_CHAT, [])));
  const [text, setText] = useState("");
  const [toast, setToast] = useState("");

  const bottomRef = useRef(null);

  // live sync (same tab + other tabs)
  useEffect(() => {
    const refreshEmps = () => setEmployees(lsReadArray(SS_KEYS.EMPLOYEES));
    const refreshMsgs = () => setMessages(asArray(lsRead(SS_KEYS.OWNER_CHAT, [])));

    refreshEmps();
    refreshMsgs();

    const u1 = subscribeKey(SS_KEYS.EMPLOYEES, refreshEmps);
    const u2 = subscribeKey(SS_KEYS.OWNER_CHAT, refreshMsgs);
    const u3 = subscribeKey(SS_KEYS.EMP_STATUS, refreshEmps); // status change refresh
    return () => {
      u1?.();
      u2?.();
      u3?.();
    };
  }, []);

  // scroll on updates
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  }, [selected?.employeeId, messages.length]);

  const employeeList = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return employees
      .map((e) => ({
        ...e,
        __status: getEmployeeStatus(e.employeeId),
      }))
      .filter((e) => e.__status !== "Inactive") // owner chats with active accounts by default
      .filter((e) => {
        if (!needle) return true;
        return (
          String(e.name || "").toLowerCase().includes(needle) ||
          String(e.employeeId || "").toLowerCase().includes(needle) ||
          String(e.role || "").toLowerCase().includes(needle) ||
          String(e.section || "").toLowerCase().includes(needle)
        );
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [employees, q]);

  const convo = useMemo(() => {
    if (!selected?.employeeId) return [];
    return messages
      .filter((m) => m?.employeeId === selected.employeeId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, selected?.employeeId]);

  const lastByEmp = useMemo(() => {
    const map = new Map();
    for (const m of messages) {
      const id = m?.employeeId;
      if (!id) continue;
      const prev = map.get(id);
      if (!prev || new Date(m.createdAt) > new Date(prev.createdAt)) map.set(id, m);
    }
    return map;
  }, [messages]);

  const send = () => {
    if (!selected?.employeeId) return;
    const t = text.trim();
    if (!t) return;

    const nextMsg = {
      id: uid(),
      employeeId: selected.employeeId,
      employeeName: selected.name || selected.employeeId,
      from: "Owner",
      text: t,
      createdAt: new Date().toISOString(),
    };

    const next = [...asArray(messages), nextMsg];
    lsWrite(SS_KEYS.OWNER_CHAT, next);
    setText("");

    setToast("✅ Sent");
    window.clearTimeout(window.__ss_owner_chat_toast);
    window.__ss_owner_chat_toast = window.setTimeout(() => setToast(""), 1000);
  };

  const layout = {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: 12,
  };

  const leftBox = {
    border: "1px solid var(--op-line)",
    borderRadius: 14,
    overflow: "hidden",
    background: "rgba(255,255,255,0.72)",
  };

  const rightBox = {
    border: "1px solid var(--op-line)",
    borderRadius: 14,
    overflow: "hidden",
    background: "rgba(255,255,255,0.72)",
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
  };

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-brand">
              <img src={logo} alt="SS" />
              <div className="op-title">
                <h1>Owner Chat</h1>
                <p>Message your employees. Clean, fast, and synced.</p>
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

            <div style={layout} className="op-chat-wrap">
              {/* LEFT: employee list */}
              <div style={leftBox}>
                <div
                  style={{
                    padding: 12,
                    fontWeight: 900,
                    background: "rgba(15,23,42,0.06)",
                    borderBottom: "1px solid var(--op-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>Employees</span>
                  <span className="op-badge blue" style={{ padding: "6px 10px" }}>
                    {employeeList.length}
                  </span>
                </div>

                <div style={{ padding: 12, borderBottom: "1px solid var(--op-line)" }}>
                  <input
                    className="op-input"
                    placeholder="Search name / role / section…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                <div style={{ maxHeight: 520, overflow: "auto" }}>
                  {employeeList.length === 0 ? (
                    <div style={{ padding: 12 }} className="op-empty">
                      No active employees found.
                    </div>
                  ) : (
                    employeeList.map((e) => {
                      const last = lastByEmp.get(e.employeeId);
                      const preview = last?.text ? String(last.text).slice(0, 42) : "No messages yet";
                      const isActive = selected?.employeeId === e.employeeId;

                      return (
                        <button
                          key={e.employeeId}
                          type="button"
                          onClick={() => setSelected(e)}
                          style={{
                            width: "100%",
                            border: 0,
                            background: isActive ? "rgba(37,99,235,0.10)" : "transparent",
                            padding: 12,
                            textAlign: "left",
                            cursor: "pointer",
                            borderBottom: "1px solid var(--op-line)",
                            display: "grid",
                            gap: 4,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                            <div style={{ fontWeight: 950, color: "var(--op-text)" }}>
                              {e.name || "—"}
                            </div>
                            <span className="op-badge green" style={{ padding: "6px 10px" }}>
                              Active
                            </span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--op-muted)" }}>
                            {e.role || "—"} {e.section ? `• ${e.section}` : ""} {e.employeeId ? `• ${e.employeeId}` : ""}
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 800, color: "var(--op-muted-2)" }}>
                            {preview}{last?.text?.length > 42 ? "…" : ""}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* RIGHT: chat */}
              <div style={rightBox}>
                <div
                  style={{
                    padding: 12,
                    fontWeight: 950,
                    background: "rgba(15,23,42,0.06)",
                    borderBottom: "1px solid var(--op-line)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <span>{selected ? `Chat with ${selected.name || selected.employeeId}` : "Select an employee"}</span>
                  {selected?.employeeId && (
                    <span className="op-badge blue" style={{ padding: "6px 10px" }}>
                      {selected.employeeId}
                    </span>
                  )}
                </div>

                <div style={{ padding: 12, height: 460, overflow: "auto", display: "grid", gap: 10 }}>
                  {!selected ? (
                    <div className="op-empty">Pick an employee on the left to start messaging.</div>
                  ) : convo.length === 0 ? (
                    <div className="op-empty">No messages yet. Say hello 👋</div>
                  ) : (
                    convo.map((m) => {
                      const mine = m.from === "Owner";
                      return (
                        <div
                          key={m.id}
                          style={{
                            justifySelf: mine ? "end" : "start",
                            maxWidth: "76%",
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: "1px solid var(--op-line)",
                            background: mine ? "rgba(37,99,235,0.12)" : "rgba(15,23,42,0.06)",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--op-muted)" }}>
                            {new Date(m.createdAt).toLocaleString()} • {mine ? "You" : (m.employeeName || "Employee")}
                          </div>
                          <div style={{ fontWeight: 800, color: "var(--op-text)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {m.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div style={{ padding: 12, borderTop: "1px solid var(--op-line)", display: "flex", gap: 10 }}>
                  <input
                    className="op-input"
                    placeholder={selected ? "Type a message…" : "Select an employee first…"}
                    value={text}
                    disabled={!selected}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send();
                    }}
                  />
                  <button className="op-btn op-btn-primary" type="button" disabled={!selected || !text.trim()} onClick={send}>
                    Send
                  </button>
                </div>
              </div>
            </div>

            <style>{`
              @media (max-width: 980px){
                .op-chat-wrap{ grid-template-columns: 1fr !important; }
              }
            `}</style>
          </section>
        </main>
      </div>
    </div>
  );
}
