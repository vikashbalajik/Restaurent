import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/customerPages.css";
import { API_BASE } from "../apiBase";


import {
  getCustomerUser,
  loginCustomerLocal,
  registerCustomerLocal,
  setCustomerUser,
  uid,
} from "../utils/ssStore";

function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Customer" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function isProbablyEmail(v) {
  return /@/.test(String(v || "").trim());
}
function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}
function digitsOnly(v) {
  return String(v || "").replace(/[^\d]/g, "");
}
function normalizeMobile(input, defaultCountry = "+1") {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (raw.startsWith("+")) return raw.replace(/\s+/g, "").replace(/-+/g, "");
  const d = digitsOnly(raw);
  if (!d) return "";
  return `${defaultCountry}${d}`;
}

export default function Login() {
  const navigate = useNavigate();
  const renderId = useMemo(() => uid(), []);

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [countryCode, setCountryCode] = useState("+1");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [remember, setRemember] = useState(true);
  const [ack, setAck] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getCustomerUser?.();
    if (u?.id) navigate("/home?mode=pickup");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const looksEmail = useMemo(() => isProbablyEmail(identifier), [identifier]);
  const normalizedEmail = useMemo(() => normalizeEmail(identifier), [identifier]);
  const normalizedMobile = useMemo(() => normalizeMobile(identifier, countryCode), [identifier, countryCode]);
  const effectiveIdentifier = useMemo(
    () => (looksEmail ? normalizedEmail : normalizedMobile),
    [looksEmail, normalizedEmail, normalizedMobile]
  );

  const validate = () => {
    const raw = String(identifier || "").trim();
    if (!raw) return "Enter your email or mobile number.";
    if (looksEmail) {
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) return "That email looks invalid.";
    } else {
      const d = digitsOnly(raw);
      if (d.length < 8) return "Enter a valid mobile number.";
    }
    if (!password || password.length < 8) return "Password must be at least 8 characters.";
    if (mode === "register") {
      if (!name.trim()) return "Enter your name.";
      if (confirm !== password) return "Passwords do not match.";
      if (!ack) return "Please accept the rules to continue.";
    }
    return "";
  };

  async function safeJson(resp) {
    try {
      return await resp.json();
    } catch {
      return null;
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setHint("");

    const v = validate();
    if (v) return setErr(v);

    try {
      setLoading(true);

      const endpoint =
  mode === "register"
    ? `${API_BASE}/api/auth/register`
    : `${API_BASE}/api/auth/login`;

      let payload;

      if (mode === "register") {
        const { firstName, lastName } = splitName(name);
        payload = {
          firstName,
          lastName,
          password,
          ack: true,
          ...(looksEmail ? { email: normalizedEmail } : { mobile: normalizedMobile }),
        };
      } else {
        payload = { identifier: effectiveIdentifier, password };
      }

      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (resp.ok) {
        const data = await safeJson(resp);
        const u = data?.user || {};
        const backendName = u?.name || [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
        const displayName =
          backendName || name.trim() || (looksEmail ? normalizedEmail.split("@")[0] : "Customer");

        setCustomerUser({
          id: u?.id,
          name: displayName,
          identifier: effectiveIdentifier,
          email: u?.email || (looksEmail ? normalizedEmail : ""),
          mobile: u?.mobile || (!looksEmail ? normalizedMobile : ""),
        });

        if (!remember) setHint("Logged in (not remembered).");
        navigate("/home?mode=pickup");
        return;
      }

      const errData = await safeJson(resp);
      const backendMsg = errData?.error || errData?.message || "";

      // local fallback
      if (mode === "register") {
        const out = registerCustomerLocal({ name: name.trim(), identifier: effectiveIdentifier, password });
        if (!out.ok) throw new Error(backendMsg || out.reason || "Unable to register.");
        navigate("/home?mode=pickup");
        return;
      }

      const out = loginCustomerLocal({ identifier: effectiveIdentifier, password });
      if (!out.ok) throw new Error(backendMsg || out.reason || "Unable to login.");
      navigate("/home?mode=pickup");
    } catch (e2) {
      setErr(String(e2?.message || "Something went wrong."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cx-page" data-render-id={renderId}>
      <div className="cx-shell" style={{ maxWidth: 760 }}>
        <header className="cx-topbar cx-topbar-lux">
          <div>
            <div className="cx-title">SS Authentic Cuisine</div>
            <div className="cx-subtitle">Sign in for delivery, faster checkout, and past orders.</div>
          </div>

          <div className="cx-topbar-actions">
            <Link className="cx-btn" to="/home?mode=pickup">Back to store</Link>
          </div>
        </header>

        <div className="cx-grid" style={{ gridTemplateColumns: "1fr" }}>
          <section className="cx-card">
            <div className="cx-card-head">
              <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
              <div className="cx-mode">
                <button
                  className={`cx-tab ${mode === "login" ? "active" : ""}`}
                  type="button"
                  onClick={() => { setMode("login"); setErr(""); setHint(""); }}
                >
                  Log in
                </button>
                <button
                  className={`cx-tab ${mode === "register" ? "active" : ""}`}
                  type="button"
                  onClick={() => { setMode("register"); setErr(""); setHint(""); }}
                >
                  Register
                </button>
              </div>
            </div>

            {err ? <div className="cx-alert">{err}</div> : null}
            {hint ? <div className="cx-hint">{hint}</div> : null}

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
              {mode === "register" ? (
                <div>
                  <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 6 }}>Name</div>
                  <input className="cx-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 8 }}>
                <div className="cx-muted" style={{ fontWeight: 900 }}>Email or Mobile</div>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 10 }}>
                  <select
                    className="cx-input"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    disabled={looksEmail}
                    title="Used for mobile only"
                  >
                    <option value="+1">+1 (US)</option>
                    <option value="+91">+91 (IN)</option>
                  </select>
                  <input
                    className="cx-input"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="you@example.com or 4055551234"
                  />
                </div>
                <div className="cx-muted">We detect email vs mobile automatically.</div>
              </div>

              <div>
                <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 6 }}>Password</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
                  <input
                    className="cx-input"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <button className="cx-btn" type="button" onClick={() => setShowPw((s) => !s)}>
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {mode === "register" ? (
                <div>
                  <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 6 }}>Confirm password</div>
                  <input
                    className="cx-input"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                  />
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <label className="cx-muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  Remember me
                </label>

                {mode === "register" ? (
                  <label className="cx-muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
                    I agree to the rules
                  </label>
                ) : null}
              </div>

              <button className="cx-btn cx-btn-primary cx-tap" type="submit" disabled={loading}>
                {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
              </button>

              <button
                className="cx-btn"
                type="button"
                onClick={() => navigate("/home?mode=pickup")}
              >
                Continue as guest
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
