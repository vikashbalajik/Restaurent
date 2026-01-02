// client/src/pages/EmployeeLogin.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/logo.png";
import "../../styles/employeePages.css";

import { SS_KEYS, lsWrite } from "../../utils/ssStore";
import { applyEmpTheme, getEmpTheme } from "../../utils/empTheme";

const API = process.env.REACT_APP_API_BASE || "";

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [theme] = useState(getEmpTheme());

  useEffect(() => {
    applyEmpTheme(theme);
  }, [theme]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!identifier.trim() || password.length < 8) {
      setErr("Enter Employee ID / Email / Mobile and an 8+ character password.");
      return;
    }

    try {
      setLoading(true);

      const resp = await fetch(`${API}/api/employees/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setErr(data?.error || "Invalid credentials");
        return;
      }

      if (data.token && remember) lsWrite(SS_KEYS.EMP_TOKEN, data.token);
      if (data.employee) lsWrite(SS_KEYS.EMP_PROFILE, data.employee);

      navigate("/employee-dashboard");
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ep-page ep-auth">
      <div className="ep-shell ep-auth-card">
        <main className="ep-glass ep-fade-in">
          <section className="ep-content">
            <div className="ep-auth-head">
              <img className="ep-auth-logo" src={logo} alt="SS logo" />
              <div className="ep-auth-title">
                <h1>Employee login</h1>
                <p>Use your Employee ID, Email, or Mobile.</p>
              </div>
            </div>

            <div className="ep-divider" />

            <form className="ep-form" onSubmit={submit} noValidate>
              <div>
                <label>Employee ID / Email / Mobile</label>
                <input
                  className="ep-input"
                  type="text"
                  placeholder="SS-E-XXXXXXX or you@ss.com or 5551234567"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                />
              </div>

              <div>
                <label>Password</label>
                <div className="ep-input-inline">
                  <input
                    className="ep-input"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="ep-btn ep-btn-outline"
                    onClick={() => setShowPw((s) => !s)}
                    aria-label="Toggle password visibility"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900 }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember me
                </label>

                <Link to="/forgot" className="ep-muted" style={{ fontWeight: 900 }}>
                  Forgot password?
                </Link>
              </div>

              {err && <div className="ep-alert error">{err}</div>}

              <div className="ep-auth-actions">
                <button className="ep-btn ep-btn-primary" disabled={loading}>
                  {loading ? "Logging in…" : "Log in"}
                </button>
                <Link className="ep-btn ep-btn-outline" to="/register-employee">
                  Create account
                </Link>
                <Link className="ep-btn ep-btn-outline" to="/">
                  Home
                </Link>
              </div>

              <div className="ep-divider" />

              <div className="ep-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                Tip: Use the theme switcher in <b>Settings</b> after login.
              </div>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
