// client/src/pages/employee/EmployeeProfile.jsx (or your current path)
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";
import "../../styles/employeePages.css";

import { SS_KEYS, lsRead, lsWrite, getEmpProfile } from "../../utils/ssStore";
import { applyEmpTheme, getEmpTheme } from "../../utils/empTheme";

const API = process.env.REACT_APP_API_BASE || "";

export default function EmployeeProfile() {
  const [theme] = useState(getEmpTheme());

  // ✅ FIX: do NOT return the string from applyEmpTheme as an effect cleanup
  useEffect(() => {
    applyEmpTheme(theme);
  }, [theme]);

  const token = useMemo(
    () => lsRead(SS_KEYS.EMP_TOKEN, "") || localStorage.getItem("emp_token") || "",
    []
  );

  const cachedMe = getEmpProfile();

  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: "", mobile: "", address: "" });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const headers = useMemo(
    () => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchMe = async () => {
    setErr("");
    setOk("");
    setLoading(true);
    try {
      const resp = await fetch(`${API}/api/employees/me`, { headers });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to load profile");

      setProfile(data);
      setForm({
        name: data.name || "",
        mobile: data.mobile || "",
        address: data.address || "",
      });

      lsWrite(SS_KEYS.EMP_PROFILE, data);
      localStorage.setItem("emp_profile", JSON.stringify(data));
    } catch (e) {
      setErr(e.message);
      if (cachedMe) {
        setProfile(cachedMe);
        setForm({
          name: cachedMe.name || "",
          mobile: cachedMe.mobile || "",
          address: cachedMe.address || "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!form.name.trim() || !form.mobile.trim()) {
      setErr("Name and mobile are required.");
      return;
    }

    try {
      setSaving(true);
      const resp = await fetch(`${API}/api/employees/me`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          name: form.name.trim(),
          mobile: form.mobile.trim(),
          address: form.address.trim(),
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to update profile");

      setOk("✅ Profile updated successfully.");
      setProfile(data);

      lsWrite(SS_KEYS.EMP_PROFILE, data);
      localStorage.setItem("emp_profile", JSON.stringify(data));
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setSaving(false);
    }
  };

  if (!cachedMe && !token) {
    return (
      <div className="ep-page">
        <div className="ep-shell">
          <main className="ep-glass ep-fade-in">
            <header className="ep-topbar">
              <div className="ep-title">
                <h1>My Profile</h1>
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
                <h1>My Profile</h1>
                <p>Update details — stored with time & date.</p>
              </div>
            </div>

            <div className="ep-actions">
              <button className="ep-btn ep-btn-outline" onClick={fetchMe}>
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
            {loading ? (
              <div className="ep-empty">Loading profile…</div>
            ) : (
              <div className="ep-grid-2">
                <div className="ep-card">
                  <div className="ep-kicker">
                    <h2>Account info</h2>
                    <div className="ep-mini">Read-only fields</div>
                  </div>

                  <div className="ep-badges" style={{ marginBottom: 10 }}>
                    <span className="ep-badge blue">
                      Email: <span style={{ fontWeight: 950 }}>{profile?.email || "—"}</span>
                    </span>
                    <span className="ep-badge">
                      Employee ID: <span style={{ fontWeight: 950 }}>{profile?.employeeId || "—"}</span>
                    </span>
                  </div>

                  <div className="ep-divider" />

                  <div className="ep-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                    Last updated
                  </div>
                  <div style={{ fontWeight: 950, marginTop: 6, color: "var(--ep-text)" }}>
                    {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "—"}
                  </div>

                  <div className="ep-divider" />

                  <div className="ep-muted" style={{ fontSize: 12, fontWeight: 900 }}>
                    Tip: Keep your mobile updated so the owner can reach you quickly.
                  </div>
                </div>

                <div className="ep-card">
                  <div className="ep-kicker">
                    <h2>Edit details</h2>
                    <div className="ep-mini">Name + mobile required</div>
                  </div>

                  <form className="ep-form" onSubmit={save}>
                    <div>
                      <label>Name</label>
                      <input
                        className="ep-input"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label>Mobile</label>
                      <input
                        className="ep-input"
                        value={form.mobile}
                        onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                      />
                    </div>

                    <div>
                      <label>Address</label>
                      <textarea
                        className="ep-textarea"
                        rows={4}
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>

                    {err && <div className="ep-alert error">{err}</div>}
                    {ok && <div className="ep-alert success">{ok}</div>}

                    <button className="ep-btn ep-btn-primary" disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
