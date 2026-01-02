// src/pages/OwnerSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/ownerPages.css";

const API = process.env.REACT_APP_API_BASE || "";
const THEME_KEY = "op_theme";

function applyTheme(theme) {
  const t = theme || "light";
  document.body.dataset.opTheme = t;
  localStorage.setItem(THEME_KEY, t);
}

function readTheme() {
  return localStorage.getItem(THEME_KEY) || "light";
}

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function OwnerSettings() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(readTheme());

  // change password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const token = useMemo(() => localStorage.getItem("owner_token"), []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const logout = () => {
    localStorage.removeItem("owner_token");
    localStorage.removeItem("owner_profile");
    navigate("/owner-login", { replace: true });
  };

  const exportAllData = () => {
    // Keep it simple: export all known keys in one file
    const keys = Object.keys(localStorage);
    const payload = {};
    keys.forEach((k) => {
      try {
        const v = localStorage.getItem(k);
        payload[k] = (() => {
          try { return JSON.parse(v); } catch { return v; }
        })();
      } catch {}
    });

    downloadJSON(`owner_backup_${new Date().toISOString().slice(0,10)}.json`, payload);
    setMsg({ type: "success", text: "✅ Backup exported (JSON)." });
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!token) {
      setMsg({ type: "error", text: "You must be logged in to change your password." });
      return;
    }
    if (newPassword.length < 8) {
      setMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirm) {
      setMsg({ type: "error", text: "New password and confirm password do not match." });
      return;
    }

    try {
      setLoading(true);

      // ✅ Primary endpoint (recommended)
      let resp = await fetch(`${API}/api/owners/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      // fallback if your backend uses a different path
      if (!resp.ok) {
        const fallback = await fetch(`${API}/api/owners/password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        resp = fallback;
      }

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        setMsg({ type: "error", text: data?.error || "Password update failed (check API route)." });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setMsg({ type: "success", text: "✅ Password updated successfully." });
    } catch {
      setMsg({ type: "error", text: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-title">
              <h1>Owner Settings</h1>
              <p>Themes • Security • Backup</p>
            </div>
            <div className="op-actions">
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">← Dashboard</Link>
              <button className="op-btn op-btn-primary" onClick={logout}>Log out</button>
            </div>
          </header>

          <section className="op-content">
            {msg.text ? (
              <div className={`op-alert ${msg.type}`} style={{ marginBottom: 12 }}>
                {msg.text}
              </div>
            ) : null}

            <div className="op-row">
              {/* Theme */}
              <div className="op-card">
                <h2>Theme</h2>
                <div className="op-muted" style={{ marginBottom: 10 }}>
                  Choose how the owner pages look.
                </div>

                <div className="op-theme-switch">
                  <button
                    className={`op-theme-pill ${theme === "light" ? "is-active" : ""}`}
                    onClick={() => setTheme("light")}
                    type="button"
                  >
                    ☀️ Light
                  </button>

                  <button
                    className={`op-theme-pill ${theme === "dark" ? "is-active" : ""}`}
                    onClick={() => setTheme("dark")}
                    type="button"
                  >
                    🌙 Dark
                  </button>

                  <button
                    className={`op-theme-pill ${theme === "colorful" ? "is-active" : ""}`}
                    onClick={() => setTheme("colorful")}
                    type="button"
                  >
                    🎨 Colorful
                  </button>
                </div>

                <div className="op-divider" />

                <button className="op-btn op-btn-outline" onClick={exportAllData} type="button">
                  ⭳ Export backup (JSON)
                </button>

                <div className="op-muted" style={{ marginTop: 10 }}>
                  Backup includes employees, shifts, receipts, announcements, etc. (whatever is in localStorage).
                </div>
              </div>

              {/* Change password */}
              <div className="op-card">
                <h2>Security</h2>
                <div className="op-muted" style={{ marginBottom: 10 }}>
                  Change your owner password.
                </div>

                <form className="op-form" onSubmit={changePassword}>
                  <div>
                    <label>Current password</label>
                    <input
                      className="op-input"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="••••••••"
                    />
                  </div>

                  <div>
                    <label>New password</label>
                    <input
                      className="op-input"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      placeholder="8+ characters"
                    />
                  </div>

                  <div>
                    <label>Confirm new password</label>
                    <input
                      className="op-input"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Repeat new password"
                    />
                  </div>

                  <button className="op-btn op-btn-primary" disabled={loading} type="submit">
                    {loading ? "Updating…" : "Update password"}
                  </button>

                  <div className="op-muted">
                    If your backend route is different, rename the endpoint in this file.
                  </div>
                </form>
              </div>
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}
