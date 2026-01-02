import React, { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/ownerPages.css";
import { SS_KEYS, lsRead, lsWrite, uid } from "../utils/ssStore";

const categories = ["Starter", "Main", "Dessert", "Beverage", "Special"];

export default function OwnerMenu() {
  const [items, setItems] = useState(() => lsRead(SS_KEYS.OWNER_MENU, []));
  const [ok, setOk] = useState("");

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "Special",
    isSpecial: true,
    description: "",
    imageUrl: "",
  });

  const add = (e) => {
    e.preventDefault();
    setOk("");

    if (!form.name.trim()) return;

    const next = [
      {
        id: uid(),
        name: form.name.trim(),
        price: String(form.price || "").trim(),
        category: form.category,
        isSpecial: !!form.isSpecial,
        description: form.description.trim(),
        imageUrl: form.imageUrl.trim(),
        createdAt: new Date().toISOString(),
      },
      ...items,
    ];

    lsWrite(SS_KEYS.OWNER_MENU, next);
    setItems(next);
    setOk("✅ Item added.");
    setForm({ name: "", price: "", category: "Special", isSpecial: true, description: "", imageUrl: "" });
  };

  const remove = (id) => {
    const next = items.filter((x) => x.id !== id);
    lsWrite(SS_KEYS.OWNER_MENU, next);
    setItems(next);
  };

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-brand">
              <img src={logo} alt="SS" />
              <div className="op-title">
                <h1>Menu & Specials</h1>
                <p>Add menu items that reflect on the customer page.</p>
              </div>
            </div>
            <div className="op-actions">
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">← Dashboard</Link>
            </div>
          </header>

          <section className="op-content">
            <div className="op-row">
              <div className="op-card">
                <h2>Add menu item</h2>

                <form className="op-form" onSubmit={add}>
                  <div className="op-row">
                    <div>
                      <label>Name</label>
                      <input className="op-input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div>
                      <label>Price</label>
                      <input className="op-input" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} placeholder="₹249" />
                    </div>
                  </div>

                  <div className="op-row">
                    <div>
                      <label>Category</label>
                      <select className="op-select" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label>Special</label>
                      <select className="op-select" value={form.isSpecial ? "yes" : "no"} onChange={(e) => setForm(f => ({ ...f, isSpecial: e.target.value === "yes" }))}>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label>Description</label>
                    <textarea className="op-textarea" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>

                  <div>
                    <label>Image URL (optional)</label>
                    <input className="op-input" value={form.imageUrl} onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
                  </div>

                  {ok && <div className="op-alert success">{ok}</div>}
                  <button className="op-btn op-btn-primary">Add item</button>
                </form>
              </div>

              <div className="op-card">
                <h2>Menu items</h2>

                {items.length === 0 ? (
                  <div className="op-empty">No items yet.</div>
                ) : (
                  <div className="op-table-wrap">
                    <table className="op-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Category</th>
                          <th>Special</th>
                          <th>Price</th>
                          <th>Description</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td style={{ fontWeight: 900 }}>{it.name}</td>
                            <td><span className="op-badge blue">{it.category}</span></td>
                            <td>{it.isSpecial ? <span className="op-badge amber">Special</span> : <span className="op-badge">—</span>}</td>
                            <td>{it.price || "—"}</td>
                            <td style={{ maxWidth: 420 }}>{it.description || "—"}</td>
                            <td>
                              <button className="op-btn op-btn-danger" onClick={() => remove(it.id)}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
