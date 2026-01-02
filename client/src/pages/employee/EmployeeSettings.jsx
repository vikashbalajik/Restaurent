// client/src/pages/EmployeeSettings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import "../../styles/employeePages.css";

import { getEmpProfile, SS_KEYS, lsRead } from "../../utils/ssStore";
import { applyEmpTheme, getEmpTheme } from "../../utils/empTheme";

const API = process.env.REACT_APP_API_BASE || "";

export default function EmployeeSettings() {
  const me = getEmpProfile();
  const token = useMemo(() => {
    // prefer ssStore, fallback to old key
    return lsRead?.(SS_KEYS.EMP_TOKEN, "") || localStorage.getItem("emp_token") || "";
  }, []);

  const [theme, setTheme] = useState(getEmpTheme());

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    applyEmpTheme(theme);
  }, [theme]);

  const changePassword = async (e) => {
    e.preventDefault();
    setOk("");
    setErr("");

    if (!oldPassword || newPassword.length < 8) {
      setErr("Old password required and new password must be 8+ characters.");
      return;
    }
    if (newPassword !== confirm) {
      setErr("New password and confirm password do not match.");
      return;
    }

    try {
      setSaving(true);

      // NOTE: If your backend route is different, adjust this endpoint.
      const resp = await fetch(`${API}/api/employees/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to change password");

      setOldPassword("");
      setNewPassword("");
      setConfirm("");
      setOk("✅ Password updated successfully.");
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  if (!me) {
    return (
      <div className="ep-page">
        <div className="ep-shell">
          <main className="ep-glass ep-fade-in">
            <header className="ep-topbar">
              <div className="ep-title">
                <h1>Settings</h1>
                <p>Session expired. Please log in again.</p>
              </div>
            </header>
            <section className="ep-content">
              <div className="ep-alert error">Cannot read employee profile. Please login again.</div>
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <Link className="ep-btn ep-btn-primary" to="/employee-login">
                  Go to Employee Login
                </Link>
                <Link className="ep-btn ep-btn-outline" to="/">
                  Home
                </Link>
              </div>
            </section>
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
                <h1>Settings</h1>
                <p>Theme + password • {me.name || "Employee"}</p>
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
                  <h2>Theme</h2>
                  <div className="ep-mini">Applies to all employee pages</div>
                </div>

                <label style={{ marginTop: 10 }}>Select theme</label>
                <select className="ep-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="vivid">Colorful</option>
                </select>

                <div className="ep-divider" />
                <div className="ep-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                  Tip: Dark theme looks best for night shifts.
                </div>
              </div>

              <div className="ep-card">
                <div className="ep-kicker">
                  <h2>Change password</h2>
                  <div className="ep-mini">Use a strong password</div>
                </div>

                <form className="ep-form" onSubmit={changePassword}>
                  <div>
                    <label>Old password</label>
                    <input
                      className="ep-input"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="ep-row">
                    <div>
                      <label>New password</label>
                      <input
                        className="ep-input"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="8+ characters"
                      />
                    </div>
                    <div>
                      <label>Confirm</label>
                      <input
                        className="ep-input"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>

                  {err && <div className="ep-alert error">{err}</div>}
                  {ok && <div className="ep-alert success">{ok}</div>}

                  <button className="ep-btn ep-btn-primary" disabled={saving}>
                    {saving ? "Updating…" : "Update password"}
                  </button>

                  <div className="ep-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                    If endpoint differs, update: <code>/api/employees/change-password</code>
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
