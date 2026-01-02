// client/src/pages/employee/EmployeeChat.jsx (or your current path)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import "../../styles/employeePages.css";

import { SS_KEYS, lsRead, getEmpProfile } from "../../utils/ssStore";
import { applyEmpTheme, getEmpTheme } from "../../utils/empTheme";

const API = process.env.REACT_APP_API_BASE || "";

export default function EmployeeChat() {
  const [theme] = useState(getEmpTheme());

  // ✅ FIX: do NOT return the string from applyEmpTheme as an effect cleanup
  useEffect(() => {
    applyEmpTheme(theme);
  }, [theme]);

  const token = useMemo(
    () => lsRead(SS_KEYS.EMP_TOKEN, "") || localStorage.getItem("emp_token") || "",
    []
  );

  const me = getEmpProfile();

  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [err, setErr] = useState("");

  const bottomRef = useRef(null);

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchUsers = async () => {
    setErr("");
    setLoadingUsers(true);
    try {
      const resp = await fetch(`${API}/api/employees/directory`, { headers });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load employees");
      setUsers(Array.isArray(data) ? data : data.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchMessages = async (otherId) => {
    setErr("");
    setLoadingMsgs(true);
    try {
      const resp = await fetch(`${API}/api/messages/${otherId}`, { headers });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load messages");

      setMessages(Array.isArray(data) ? data : data.items || []);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected?._id) return;

    fetchMessages(selected._id);
    const id = setInterval(() => fetchMessages(selected._id), 4000);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?._id]);

  const send = async () => {
    setErr("");
    if (!selected?._id) return;
    if (!text.trim()) return;

    try {
      const resp = await fetch(`${API}/api/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ receiverId: selected._id, message: text.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to send message");
      setText("");
      await fetchMessages(selected._id);
    } catch (e) {
      setErr(e.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const needle = q.trim().toLowerCase();
    if (!needle) return true;
    return (
      (u.name || "").toLowerCase().includes(needle) ||
      (u.role || "").toLowerCase().includes(needle) ||
      (u.section || "").toLowerCase().includes(needle)
    );
  });

  const isMine = (m) => {
    const sender = m.senderId || m.sender || m.from || m.sender?._id;
    const myId = me?._id || me?.id;
    if (sender && myId) return String(sender) === String(myId);

    const senderEmpId = m.senderEmployeeId || m.senderEmpId;
    if (senderEmpId && me?.employeeId) return String(senderEmpId) === String(me.employeeId);

    return false;
  };

  if (!me) {
    return (
      <div className="ep-page">
        <div className="ep-shell">
          <main className="ep-glass ep-fade-in">
            <header className="ep-topbar">
              <div className="ep-title">
                <h1>Chat</h1>
                <p>Session expired. Please login again.</p>
              </div>
              <div className="ep-actions">
                <Link className="ep-btn ep-btn-primary" to="/employee-login">
                  Go to Employee Login
                </Link>
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
                <h1>Chat</h1>
                <p>Message your teammates.</p>
              </div>
            </div>

            <div className="ep-actions">
              <button className="ep-btn ep-btn-outline" onClick={fetchUsers}>
                ↻ Refresh
              </button>
              <Link className="ep-btn ep-btn-outline" to="/employee/settings">
                ⚙️ Settings
              </Link>
              <Link className="ep-btn ep-btn-outline" to="/employee-dashboard">
                ← Dashboard
              </Link>
            </div>
          </header>

          <section className="ep-content">
            {err && (
              <div className="ep-alert error" style={{ marginBottom: 12 }}>
                {err}
              </div>
            )}

            <div className="ep-chat-grid">
              <div className="ep-list">
                <div className="ep-list-head">
                  <span>Employees</span>
                  <span className="ep-muted" style={{ fontSize: 12 }}>
                    {loadingUsers ? "Loading…" : `${users.length}`}
                  </span>
                </div>

                <div style={{ padding: 12, borderBottom: "1px solid var(--ep-line)" }}>
                  <input
                    className="ep-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search name / role / section…"
                  />
                </div>

                <div className="ep-list-body">
                  {loadingUsers ? (
                    <div style={{ padding: 12 }} className="ep-muted">
                      Loading employees…
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div style={{ padding: 12 }} className="ep-muted">
                      No matches.
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u._id}
                        className={`ep-person ${selected?._id === u._id ? "active" : ""}`}
                        onClick={() => setSelected(u)}
                        type="button"
                      >
                        <div className="name">{u.name}</div>
                        <div className="meta">
                          {u.role || "—"} {u.section ? `• ${u.section}` : ""}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="ep-chat">
                <div className="ep-chat-head">
                  {selected ? `Chat with ${selected.name}` : "Select an employee"}
                </div>

                <div className="ep-chat-body">
                  {!selected ? (
                    <div className="ep-empty">Pick a person on the left to start chatting.</div>
                  ) : loadingMsgs ? (
                    <div className="ep-empty">Loading messages…</div>
                  ) : messages.length === 0 ? (
                    <div className="ep-empty">No messages yet. Say hi 👋</div>
                  ) : (
                    messages.map((m) => (
                      <div key={m._id} className={`ep-bubble ${isMine(m) ? "me" : ""}`}>
                        <div className="time">
                          {m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}
                        </div>
                        <div className="msg">{m.message}</div>
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="ep-chat-send">
                  <input
                    className="ep-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={selected ? "Type a message…" : "Select a user first"}
                    disabled={!selected}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send();
                    }}
                  />
                  <button className="ep-btn ep-btn-primary" onClick={send} disabled={!selected}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
