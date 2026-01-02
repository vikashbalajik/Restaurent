import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import logo from '../../assets/logo.png';


const API = process.env.REACT_APP_API_BASE || ''; // or use CRA proxy

// Client-side Employee ID generator (consistent, readable)
function makeEmployeeId() {
  return `SS-E-${uuidv4().slice(0, 8).toUpperCase()}`;
}

export default function RegisterEmployee() {
  const navigate = useNavigate();

  // Generate once per mount
  const generatedEmpId = useMemo(() => makeEmployeeId(), []);
  const [form, setForm] = useState({
    employeeId: generatedEmpId,
    name: '',
    email: '',
    password: '',
    mobile: '',
    address: '',
    date: '',
    aadharNo: '',
    section: '',
    role: '',
    duties: '',
    status: 'Pending'
  });

  const [showPw, setShowPw] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  // ------- Role options -------
  const frontRoles = {
    'Host/Hostess': 'Greets and seats customers, manages reservations, and handles inquiries.',
    'Server/Waiter/Waitress': 'Takes orders, serves, handles payments, ensures satisfaction.',
    'Busser': 'Cleans tables, sets up dining areas, assists with refills.',
    'Bartender': 'Prepares drinks, maintains bar; may take food orders.',
    'Food Runner': 'Delivers food orders from kitchen to tables.',
    'Cashier': 'Processes payments and handles transactions.',
    'Manager': 'Oversees operations, manages staff, handles admin tasks.'
  };
  const backRoles = {
    'Executive Chef': 'Leads kitchen, menu development, staffing, food quality.',
    'Chef de Cuisine': 'Manages kitchen staff, inventory, prep, quality control.',
    'Sous Chef': 'Second in command; supports Head Chef; steps in as needed.',
    'Chef de Partie': 'Leads a specific kitchen station/section.',
    'Line Cook': 'Prepares dishes at assigned station.',
    'Prep Cook': 'Washes, chops, prepares ingredients.',
    'Dishwasher': 'Cleans dishes, utensils, equipment.',
    'Kitchen Manager': 'Oversees daily kitchen operations.'
  };
  const roleOptions =
    form.section === 'Front of House' ? Object.keys(frontRoles)
      : form.section === 'Back of House' ? Object.keys(backRoles)
      : [];

  // Default DOJ today
  useEffect(() => {
    setForm(f => ({ ...f, date: new Date().toISOString().split('T')[0] }));
  }, []);

  // Auto-fill duties when role changes
  useEffect(() => {
    const dutiesText =
      form.section === 'Front of House' ? frontRoles[form.role] : backRoles[form.role];
    setForm(f => ({ ...f, duties: dutiesText || '' }));
    
  }, [form.section, form.role]);

  // ------- Validation like Register.jsx -------
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((e || '').trim());
  const phoneOk = (m) => /^\+?[0-9\s\-()]{7,15}$/.test((m || '').trim());
  const pwOk = (pw) => pw && pw.length >= 8;
  const aadhaarOk = (a) => /^\d{12}$/.test((a || '').trim());

  const canSubmit =
    !!form.employeeId &&
    !!form.name.trim() &&
    emailOk(form.email) &&
    phoneOk(form.mobile) &&
    pwOk(form.password) &&
    !!form.address.trim() &&
    !!form.date &&
    aadhaarOk(form.aadharNo) &&
    !!form.section &&
    !!form.role;

  // ------- Handlers -------
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const regenerateId = () => {
    setForm(f => ({ ...f, employeeId: makeEmployeeId() }));
  };

  const copyId = async () => {
    try { await navigator.clipboard.writeText(form.employeeId); } catch {}
  };

  const submit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!canSubmit) return;

    setLoading(true);
    try {
      const payload = {
        employeeId: form.employeeId,                 // client-generated; server enforces uniqueness
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,                     // server hashes
        mobile: form.mobile.trim(),
        address: form.address.trim(),
        date: form.date,                             // yyyy-mm-dd
        aadharNo: form.aadharNo.trim(),
        status: form.status || 'Pending',
        section: form.section,
        role: form.role,
        duties: form.duties
      };

      const resp = await fetch(`${API}/api/employees/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();

      if (!resp.ok) {
        setServerError(data?.error || 'Registration failed');
        return;
      }

      alert('Employee registered successfully!');
      navigate('/employee-Login');
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <main className="card fade-in" role="main" aria-label="Register employee">
        <img className="logo" src={logo} alt="SS logo" />
        <h1 style={{ textAlign: 'center', marginBottom: 8 }}>Register Employee</h1>
        <p className="subtitle" style={{ textAlign: 'center', marginTop: -6 }}>
          Add team members for SS Authentic Cuisine.
        </p>

        <form onSubmit={submit} noValidate>
          {/* Employee ID with Copy & New */}
          <label htmlFor="employeeId">Employee ID</label>
          <div className="input-group">
            <input
              id="employeeId"
              name="employeeId"
              type="text"
              value={form.employeeId}
              readOnly
              aria-readonly="true"
            />
            <button type="button" className="chip" onClick={copyId} title="Copy ID">Copy</button>
            <button type="button" className="chip" onClick={regenerateId} title="Generate new ID">New</button>
          </div>
          <small className="hint">Auto-generated here; the server still enforces uniqueness.</small>

          <label htmlFor="name">Full name</label>
          <input id="name" name="name" type='text' value={form.name} onChange={onChange} placeholder="e.g., Arjun Mehta" />

          <div className="row">
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" value={form.email} onChange={onChange} placeholder="you@example.com" />
              {form.email && !emailOk(form.email) && <div className="error">Invalid email</div>}
            </div>
            <div>
              <label htmlFor="mobile">Mobile</label>
              <input id="mobile" name="mobile" type="tel" value={form.mobile} onChange={onChange} placeholder="+1 555 123 4567" />
              {form.mobile && !phoneOk(form.mobile) && <div className="error">Invalid phone</div>}
            </div>
          </div>

          <label htmlFor="password">Password</label>
          <div className="input-group">
            <input
              id="password"
              name="password"
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={onChange}
              placeholder="At least 8 characters"
            />
            <button type="button" className="chip" onClick={() => setShowPw(s => !s)}>
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          {form.password && !pwOk(form.password) && <div className="error">Password must be at least 8 characters</div>}

          <label htmlFor="address">Address</label>
          <textarea id="address" name="address" type='address' rows={2} value={form.address} onChange={onChange} />

          <div className="row">
            <div>
              <label htmlFor="date">Date of Joining</label>
              <input id="date" name="date" type="date" value={form.date} onChange={onChange} />
            </div>
            <div>
              <label htmlFor="aadharNo">Aadhaar Number</label>
              <input id="aadharNo" name="aadharNo" type='text' value={form.aadharNo} onChange={onChange} placeholder="12 digits" />
              {form.aadharNo && !aadhaarOk(form.aadharNo) && <div className="error">Aadhaar must be 12 digits</div>}
            </div>
          </div>

          <label htmlFor="section">Section</label>
          <select
            id="section"
            name="section"
            value={form.section}
            onChange={(e) => setForm(f => ({ ...f, section: e.target.value, role: '', duties: '' }))}
          >
            <option value="">Select Section</option>
            <option value="Front of House">Front of House</option>
            <option value="Back of House">Back of House</option>
          </select>

          {form.section && (
            <>
              <label htmlFor="role">Role</label>
              <select id="role" name="role" value={form.role} onChange={onChange}>
                <option value="">Select Role</option>
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              {!!form.duties && (
                <>
                  <label htmlFor="duties">Duties</label>
                  <textarea id="duties" name="duties" rows={3} value={form.duties} readOnly className="muted" />
                </>
              )}
            </>
          )}

          {serverError && <div className="error" style={{ marginTop: 8 }}>{serverError}</div>}

          <div className="actions">
            <button className="btn btn-primary" type="submit" disabled={!canSubmit || loading}>
              {loading ? 'Registering…' : 'Register'}
            </button>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() =>
                setForm(f => ({
                  ...f,
                  employeeId: makeEmployeeId(),
                  name: '', email: '', password: '',
                  mobile: '', address: '', aadharNo: '',
                  section: '', role: '', duties: ''
                }))
              }
            >
              Clear
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
