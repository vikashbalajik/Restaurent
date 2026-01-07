import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import logo from '../assets/logo.png';
import { API_BASE } from "../apiBase";

export default function Register() {
  const navigate = useNavigate();

  // Preview ID on the client (server still enforces uniqueness)
  const generatedId = useMemo(
    () => `SS-${uuidv4().slice(0, 8).toUpperCase()}`,
    []
  );

  const [form, setForm] = useState({
    userId: generatedId,
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    password: '',
    ack: false
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+?[0-9\s\-()]{7,15}$/;

  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';

    const emailOk = form.email ? emailRegex.test(form.email) : false;
    const mobileOk = form.mobile ? phoneRegex.test(form.mobile) : false;
    if (!emailOk && !mobileOk) e.contact = 'Provide a valid email OR mobile number';

    if (form.password.length < 8)
      e.password = 'Password must be at least 8 characters';

    if (!form.ack)
      e.ack = 'You must acknowledge the SS Rewards rules';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const canSubmit = (() => {
    const emailOk = form.email ? emailRegex.test(form.email) : false;
    const mobileOk = form.mobile ? phoneRegex.test(form.mobile) : false;
    return (
      !!form.firstName.trim() &&
      !!form.lastName.trim() &&
      (emailOk || mobileOk) &&
      form.password.length >= 8 &&
      form.ack
    );
  })();

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(form.userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: form.userId, // server can also generate/replace
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim() || '',
          mobile: form.mobile.trim() || '',
          password: form.password,
          ack: form.ack
        })
      });

      const data = await resp.json();
      if (!resp.ok) {
        const msg =
          data?.error ||
          data?.details?.formErrors?.join(', ') ||
          'Registration failed';
        setServerError(msg);
        return;
      }

      alert(`Registered! Your User ID is ${data.user.userId}`);
      navigate('/login'); // ⬅ go to Login first
    } catch (err) {
      setServerError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <main className="card" role="main" aria-label="User registration">
        <img className="logo" src={logo} alt="SS Authentic Cuisine logo" />
        <h1>Create your SS account</h1>
        <p className="subtitle">Earn rewards and track your orders.</p>

        <form onSubmit={handleSubmit} noValidate>
          {/* User ID (read-only) + copy */}
          <label htmlFor="userId">User ID</label>
          <div className="input-group">
            <input
              id="userId"
              name="userId"
              type="text"
              value={form.userId}
              readOnly
              aria-readonly="true"
              autoComplete="off"
            />
            <button
              type="button"
              className="chip"
              aria-label="Copy user id"
              onClick={copyUserId}
              title="Copy"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <small className="hint">This is auto-generated and will be shown on your account.</small>

          {/* Names */}
          <div className="row">
            <div>
              <label htmlFor="firstName">First name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={form.firstName}
                onChange={onChange}
                autoComplete="given-name"
                placeholder="e.g., Priya"
              />
              {errors.firstName && <div className="error">{errors.firstName}</div>}
            </div>
            <div>
              <label htmlFor="lastName">Last name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={form.lastName}
                onChange={onChange}
                autoComplete="family-name"
                placeholder="e.g., Sharma"
              />
              {errors.lastName && <div className="error">{errors.lastName}</div>}
            </div>
          </div>

          {/* Divider */}
          <div className="divider">Contact (use <strong>either</strong> Email or Mobile)</div>

          {/* Contact: Email / Mobile */}
          <div className="row">
            <div>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={onChange}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="mobile">Mobile</label>
              <input
                id="mobile"
                name="mobile"
                type="tel"
                value={form.mobile}
                onChange={onChange}
                placeholder="+1 555 123 4567"
                autoComplete="tel"
              />
            </div>
          </div>
          {errors.contact && <div className="error">{errors.contact}</div>}
          <small className="hint">We’ll use this to help you log in and send order updates.</small>

          {/* Password + toggle */}
          <label htmlFor="password">Password</label>
          <div className="input-group">
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={onChange}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              className="chip"
              onClick={() => setShowPw(s => !s)}
              aria-label="Toggle password visibility"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && <div className="error">{errors.password}</div>}

          {/* Acknowledgement */}
          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                name="ack"
                checked={form.ack}
                onChange={onChange}
                aria-describedby="acknote"
              />
              <span>
                I acknowledge the&nbsp;
                <Link to="/rules" target="_blank" rel="noopener">
                  SS Rewards Rules
                </Link>
                .
              </span>
            </label>
            {errors.ack && <div className="error">{errors.ack}</div>}
            <small id="acknote" className="muted">
              You must accept to continue.
            </small>
          </div>

          {serverError && <div className="error" style={{ marginTop: 8 }}>{serverError}</div>}

          {/* Actions */}
          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={!canSubmit || loading}>
              {loading ? 'Creating…' : 'Create account'}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  firstName: '',
                  lastName: '',
                  email: '',
                  mobile: '',
                  password: '',
                  ack: false
                }))
              }
            >
              Clear
            </button>
          </div>

          <p style={{ marginTop: 12, textAlign: 'center' }}>
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </form>

        <nav className="footer-nav" aria-label="Secondary">
          <Link to="/home">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/about">About</Link>
        </nav>
      </main>
    </div>
  );
}
