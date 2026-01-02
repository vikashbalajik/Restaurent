import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  SS_KEYS,
  lsReadArray,
  subscribeKey,
  getCustomerUser,
  addOrderIssue,
} from "../utils/ssStore";
import "../styles/customerPages.css";

const CATEGORIES = [
  "Received someone else's order",
  "Order never arrived",
  "Issue with items",
  "Order arrived late",
  "Something else",
];

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function OrderHelp() {
  const [params] = useSearchParams();
  const orderId = String(params.get("orderId") || "");

  const customer = useMemo(() => getCustomerUser(), []);
  const customerKey = customer?.id || customer?.email || customer?.phone || "";

  const [orders, setOrders] = useState(() => lsReadArray(SS_KEYS.ORDERS));
  useEffect(() => {
    setOrders(lsReadArray(SS_KEYS.ORDERS));
    return subscribeKey(SS_KEYS.ORDERS, () => setOrders(lsReadArray(SS_KEYS.ORDERS)));
  }, []);

  const order = useMemo(() => orders.find((o) => o.id === orderId) || null, [orders, orderId]);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState(null); // data url
  const [done, setDone] = useState("");

  return (
    <div className="cx-page">
      <div className="cx-shell">
        <header className="cx-topbar cx-topbar-lux">
          <div>
            <div className="cx-title">Help Center</div>
            <div className="cx-subtitle">Report an issue for this order. Add a photo if needed.</div>
          </div>
          <div className="cx-topbar-actions">
            <Link className="cx-btn" to="/home?mode=pickup">Back</Link>
          </div>
        </header>

        <div className="cx-grid" style={{ gridTemplateColumns: "1fr" }}>
          <section className="cx-card">
            {!order ? (
              <div className="cx-empty">Order not found.</div>
            ) : (
              <>
                <div className="cx-card-head">
                  <h2>Order #{order.id.slice(-6)}</h2>
                  <div className="cx-muted">
                    {String(order.status || "").toUpperCase()} • {new Date(order.createdAt).toLocaleString()}
                  </div>
                </div>

                {done ? <div className="cx-hint">{done}</div> : null}

                <div style={{ display: "grid", gap: 12 }}>
                  <div>
                    <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 6 }}>What do you need help with?</div>
                    <select className="cx-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 6 }}>Describe the issue</div>
                    <textarea
                      className="cx-input"
                      style={{ minHeight: 110, resize: "vertical" }}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us what happened…"
                    />
                  </div>

                  <div>
                    <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 6 }}>
                      Upload a photo (optional)
                    </div>
                    <input
                      className="cx-input"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const d = await fileToDataUrl(f);
                        setPhoto(d);
                      }}
                    />
                    {photo ? (
                      <div style={{ marginTop: 10 }}>
                        <img
                          alt="Upload preview"
                          src={photo}
                          style={{ width: "100%", maxWidth: 420, borderRadius: 14, border: "1px solid rgba(255,255,255,0.14)" }}
                        />
                      </div>
                    ) : null}
                  </div>

                  <button
                    className="cx-btn cx-btn-primary cx-tap"
                    type="button"
                    onClick={() => {
                      addOrderIssue({
                        orderId: order.id,
                        customerId: customerKey,
                        category,
                        message,
                        photoDataUrl: photo,
                      });
                      setDone("Thanks — your report was submitted ✅");
                      setMessage("");
                      setPhoto(null);
                    }}
                  >
                    Submit
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
