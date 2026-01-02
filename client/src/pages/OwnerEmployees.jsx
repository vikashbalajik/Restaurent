// client/src/pages/OwnerEmployees.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/owner.css';
import EmployeeApplicationModal from '../components/EmployeeApplicationModal';

const API = process.env.REACT_APP_API_BASE || '';

export default function OwnerEmployees() {
  const token = localStorage.getItem('owner_token');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // filters
  const [role, setRole] = useState('');
  const [section, setSection] = useState('');
  const [statusTab, setStatusTab] = useState('Pending'); // "Pending" | "Accepted"
  const [q, setQ] = useState('');

  // ✅ modal selection
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);

  const fetchList = async () => {
    if (!token) {
      setErr('You must be logged in as an owner.');
      setRows([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErr('');

      const params = new URLSearchParams();
      if (statusTab) params.set('status', statusTab);
      if (role) params.set('role', role);
      if (section) params.set('section', section);
      if (q.trim()) params.set('q', q.trim());

      const resp = await fetch(`${API}/api/employees?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (resp.status === 401) localStorage.removeItem('owner_token');
        setErr(data?.error || 'Failed to load');
        setRows([]);
        return;
      }

      setRows(Array.isArray(data.employees) ? data.employees : []);
    } catch {
      setErr('Network error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ include token so it refetches properly if login/logout changes while on page
  useEffect(() => {
    fetchList();
  }, [statusTab, role, section, token]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(fetchList, 350);
    return () => clearTimeout(t);
  }, [q, token]);

  const uniqueRoles = useMemo(
    () => Array.from(new Set(rows.map((r) => r.role).filter(Boolean))).sort(),
    [rows]
  );

  const uniqueSections = useMemo(
    () => Array.from(new Set(rows.map((r) => r.section).filter(Boolean))).sort(),
    [rows]
  );

  // ✅ approve/reject from modal
  const handleDecision = async (id, status) => {
    if (!token) return;

    try {
      setDecisionLoading(true);

      const resp = await fetch(`${API}/api/employees/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      const data = await resp.json();

      if (!resp.ok) {
        if (resp.status === 401) localStorage.removeItem('owner_token');
        alert(data?.error || 'Update failed');
        return;
      }

      setSelectedEmployee(null);
      fetchList(); // refresh table
    } catch {
      alert('Network error');
    } finally {
      setDecisionLoading(false);
    }
  };

  const colSpan = 7;

  return (
    <div className="container">
      <main className="card owner-card-shell" role="main" aria-label="Employee approvals">
        <h1 className="owner-h1">Employee Approvals</h1>
        <p className="subtitle">Review staff registrations and approve from the application view.</p>

        {/* Not logged in / token invalid banner */}
        {!token && (
          <div className="error" style={{ marginBottom: 8 }}>
            You’re not logged in. <Link to="/owner-login">Go to owner login</Link>
          </div>
        )}
        {err && (
          <div className="error" style={{ marginBottom: 8 }}>
            {err}
          </div>
        )}

        {/* Filters / tabs */}
        <div className="owner-actions" style={{ marginBottom: 10 }}>
          <div className="chip-group" role="tablist" aria-label="Status">
            <button
              className={`chip ${statusTab === 'Pending' ? 'chip-active' : ''}`}
              onClick={() => setStatusTab('Pending')}
              role="tab"
              aria-selected={statusTab === 'Pending'}
            >
              Pending
            </button>
            <button
              className={`chip ${statusTab === 'Accepted' ? 'chip-active' : ''}`}
              onClick={() => setStatusTab('Accepted')}
              role="tab"
              aria-selected={statusTab === 'Accepted'}
            >
              Employee's
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, mobile, ID…"
            className="input"
            style={{ maxWidth: 280 }}
          />

          <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
            <option value="">All roles</option>
            {uniqueRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <select value={section} onChange={(e) => setSection(e.target.value)} className="input">
            <option value="">All sections</option>
            {uniqueSections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* ✅ Helper text */}
        <div className="owner-hint">💡 Click an application row to review and approve/reject.</div>

        {/* Table */}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Employee ID</th>
                <th>Role</th>
                <th>Section</th>
                <th>Email</th>
                <th>Mobile</th>
                <th>Date Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan}>Loading…</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="muted">
                    No employees found
                  </td>
                </tr>
              ) : (
                rows.map((emp) => (
                  <tr
                    key={emp._id}
                    onClick={() => setSelectedEmployee(emp)}
                    className="owner-row-clickable"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setSelectedEmployee(emp);
                    }}
                    aria-label={`Review application for ${emp.name}`}
                  >
                    <td>{emp.name}</td>
                    <td>{emp.employeeId}</td>
                    <td>{emp.role}</td>
                    <td>{emp.section}</td>
                    <td>{emp.email}</td>
                    <td>{emp.mobile}</td>
                    <td>{emp.date ? new Date(emp.date).toLocaleDateString() : ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="owner-actions">
          <Link to="/owner-dashboard" className="btn btn-outline">
            ⬅ Back to Dashboard
          </Link>
        </div>
      </main>

      {/* ✅ Modal */}
      <EmployeeApplicationModal
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
        onDecision={handleDecision}
        loading={decisionLoading}
      />
    </div>
  );
}
