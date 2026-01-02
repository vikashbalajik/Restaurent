import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/employeePages.css";
import { SS_KEYS, getEmpProfile, lsReadArray, lsWrite, uid, money } from "../utils/ssStore";

const TABLES = Array.from({ length: 30 }, (_, i) => i + 1);

export default function HostOrders() {
  const emp = getEmpProfile();
  const role = (emp?.role || "").toLowerCase();

  const [menu, setMenu] = useState(() => lsReadArray(SS_KEYS.OWNER_MENU));
  const [orders, setOrders] = useState(() => lsReadArray(SS_KEYS.ORDERS));

  const [tableNo, setTableNo] = useState(1);
  const [cart, setCart] = useState([]);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SS_KEYS.OWNER_MENU) setMenu(lsReadArray(SS_KEYS.OWNER_MENU));
      if (e.key === SS_KEYS.ORDERS) setOrders(lsReadArray(SS_KEYS.ORDERS));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const menuFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return menu;
    return menu.filter((m) => `${m.name || ""} ${m.category || ""}`.toLowerCase().includes(q));
  }, [menu, query]);

  if (!emp) {
    return (
      <div className="container">
        <main className="card">
          <h1>Host</h1>
          <p className="subtitle">Please login as an employee.</p>
          <Link to="/employeeLogin">Go to login</Link>
        </main>
      </div>
    );
  }

  if (role !== "host") {
    return (
      <div className="container">
        <main className="card">
          <h1>Host</h1>
          <p className="subtitle">This page is only for Host role.</p>
          <Link to="/employee-dashboard">← Back to dashboard</Link>
        </main>
      </div>
    );
  }

  const add = (m) => {
    setCart((p) => [...p, { lineId: uid(), itemId: m.id || uid(), name: m.name, price: Number(m.price || 0), qty: 1, notes: "" }]);
    setToast(`Added ${m.name}`);
    setTimeout(() => setToast(""), 900);
  };

  const total = cart.reduce((s, l) => s + Number(l.price || 0) * Number(l.qty || 0), 0);

  const place = () => {
    if (!cart.length) return;

    const order = {
      id: uid(),
      sessionId: `host_${emp.employeeId || uid()}`, // host session
      tableNo,
      status: "Placed",
      items: cart,
      orderNote: note,
      createdAt: new Date().toISOString(),
      eta: null,
      chat: [],
      payment: { mode: "none", status: "unpaid" },
      placedBy: { type: "host", employeeId: emp.employeeId, name: emp.name },
    };

    const next = [order, ...orders];
    setOrders(next);
    lsWrite(SS_KEYS.ORDERS, next);

    setCart([]);
    setNote("");
    setToast("✅ Order placed for table.");
    setTimeout(() => setToast(""), 1200);
  };

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-title">
              <h1>Host</h1>
              <p>Place dine-in orders for guests (tableside).</p>
            </div>
            <div className="op-actions">
              <Link className="op-btn op-btn-outline" to="/employee-dashboard">← Dashboard</Link>
            </div>
          </header>

          {toast && <div className="op-alert success">{toast}</div>}

          <section className="op-content">
            <div className="op-row" style={{ alignItems: "stretch" }}>
              <div className="op-card" style={{ flex: 2 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontWeight: 900 }}>Table</span>
                    <select className="op-input" value={tableNo} onChange={(e) => setTableNo(Number(e.target.value))} style={{ width: 130 }}>
                      {TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <input className="op-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search menu…" style={{ maxWidth: 320 }} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>
                  {menuFiltered.map((m, idx) => (
                    <div key={m.id || `${m.name}_${idx}`} className="op-card" style={{ padding: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 900 }}>{m.name}</div>
                        <div style={{ fontWeight: 900 }}>{money(m.price)}</div>
                      </div>
                      {m.description ? <div style={{ marginTop: 8, fontWeight: 700, opacity: 0.85 }}>{m.description}</div> : null}
                      <button className="op-btn op-btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={() => add(m)}>Add</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="op-card" style={{ flex: 1 }}>
                <h2 style={{ marginTop: 0 }}>Cart</h2>
                {!cart.length ? (
                  <div className="op-empty">Add items from menu.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {cart.map((l) => (
                      <div key={l.lineId} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 900 }}>{l.name}</div>
                          <div style={{ fontWeight: 900 }}>x{l.qty}</div>
                        </div>
                      </div>
                    ))}

                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
                      <span>Total</span>
                      <span>{money(total)}</span>
                    </div>

                    <textarea className="op-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Order note (optional)" />
                    <button className="op-btn op-btn-primary" onClick={place}>Place order</button>
                    <div className="op-alert">Kitchen will set ETA from the Kitchen screen.</div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
