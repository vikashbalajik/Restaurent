import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const API = process.env.REACT_APP_API_BASE || '';

export default function OwnerLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [err, setErr]           = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!email.trim() || password.length < 8) {
      setErr('Enter email and an 8+ character password.');
      return;
    }
    try {
      setLoading(true);
      const resp = await fetch(`${API}/api/owners/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setErr(data?.error || 'Invalid credentials');
        return;
      }
      localStorage.setItem('owner_token', data.token);
      localStorage.setItem('owner_profile', JSON.stringify(data.owner));
      navigate('/owner-dashboard'); // protect this route on the client
    } catch {
      setErr('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <main className="card fade-in" role="main" aria-label="Owner login">
        <img className="logo" src={logo} alt="SS logo" />
        <h1>Owner log in</h1>
        <p className="subtitle">Restricted area for SS owners.</p>

        <form onSubmit={submit} noValidate>
          <label htmlFor="email">Owner email</label>
          <input
            id="email"
            type="email"
            placeholder="owner1@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />

          <label htmlFor="pw">Password</label>
          <div className="input-group">
            <input
              id="pw"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              className="chip"
              onClick={() => setShowPw((s) => !s)}
              aria-label="Toggle password visibility"
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>

          {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}

          <div className="actions">
            <button className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
