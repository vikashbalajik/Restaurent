import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  SS_KEYS,
  lsReadArray,
  subscribeKey,
  addReceipt,
  buildReceiptFromOrder,
} from "../utils/ssStore";
import "../styles/customerPages.css";

export default function Receipt() {
  const [params] = useSearchParams();
  const orderId = String(params.get("orderId") || "");

  const [receipts, setReceipts] = useState(() => lsReadArray(SS_KEYS.RECEIPTS));
  const [orders, setOrders] = useState(() => lsReadArray(SS_KEYS.ORDERS));

  // live subscribe receipts + orders
  useEffect(() => {
    setReceipts(lsReadArray(SS_KEYS.RECEIPTS));
    const unsub1 = subscribeKey(SS_KEYS.RECEIPTS, () => setReceipts(lsReadArray(SS_KEYS.RECEIPTS)));

    setOrders(lsReadArray(SS_KEYS.ORDERS));
    const unsub2 = subscribeKey(SS_KEYS.ORDERS, () => setOrders(lsReadArray(SS_KEYS.ORDERS)));

    return () => {
      if (typeof unsub1 === "function") unsub1();
      if (typeof unsub2 === "function") unsub2();
    };
  }, []);

  // find receipt by exact id OR (fallback) partial match for older ids
  const receipt = useMemo(() => {
    if (!orderId) return null;
    const direct = receipts.find((r) => String(r.orderId) === orderId);
    if (direct) return direct;

    // fallback: sometimes ids differ by prefix/suffix. Try a softer match.
    const soft = receipts.find((r) => {
      const rid = String(r.orderId || "");
      return rid === orderId || rid.includes(orderId) || orderId.includes(rid);
    });
    return soft || null;
  }, [receipts, orderId]);

  // if no receipt exists, build it from the order and persist
  useEffect(() => {
    if (!orderId) return;
    if (receipt) return;

    const order =
      orders.find((o) => String(o.id) === orderId) ||
      orders.find((o) => {
        const oid = String(o.id || "");
        return oid === orderId || oid.includes(orderId) || orderId.includes(oid);
      });

    if (!order) return;

    const built = buildReceiptFromOrder(order);
    // guarantee the receipt uses the same id the URL uses
    built.orderId = String(order.id);

    addReceipt(built);
    // receipts will update via subscribeKey, but we can also refresh immediately:
    setReceipts(lsReadArray(SS_KEYS.RECEIPTS));
  }, [orderId, receipt, orders]);

  return (
    <div className="cx-page">
      <div className="cx-shell" style={{ maxWidth: 920 }}>
        <header className="cx-topbar cx-topbar-lux">
          <div>
            <div className="cx-title">Receipt</div>
            <div className="cx-subtitle">Stored bill • one checkout = one receipt</div>
          </div>
          <div className="cx-topbar-actions" style={{ display: "flex", gap: 10 }}>
            <button className="cx-btn cx-btn-soft" type="button" onClick={() => window.print()}>
              Print
            </button>
            <Link className="cx-btn" to="/home?mode=pickup">
              Back
            </Link>
          </div>
        </header>

        <div className="cx-grid" style={{ gridTemplateColumns: "1fr" }}>
          <section className="cx-card">
            {!receipt ? (
              <div className="cx-empty">
                Receipt not found yet.
                <div className="cx-muted" style={{ marginTop: 8 }}>
                  If you just placed the order, wait a second — this page will auto-create the receipt from the order.
                </div>
              </div>
            ) : (
              <>
                <div className="cx-card-head">
                  <h2>Order #{String(receipt.orderId).slice(-6)}</h2>
                  <div className="cx-muted">{new Date(receipt.createdAt).toLocaleString()}</div>
                </div>

                <div className="cx-muted" style={{ marginBottom: 12 }}>
                  Service: <b>{receipt.serviceType}</b>
                  {receipt.delivery?.address ? <> • {receipt.delivery.address}</> : null}
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {receipt.items.map((it) => (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between" }}>
                      <div style={{ fontWeight: 950 }}>
                        {it.qty}× {it.name}
                      </div>
                      <div style={{ fontWeight: 950 }}>${(it.price * it.qty).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div className="cx-divider" />

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="cx-muted">Subtotal</div>
                    <div style={{ fontWeight: 950 }}>${receipt.subtotal.toFixed(2)}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="cx-muted">Tax</div>
                    <div style={{ fontWeight: 950 }}>${receipt.tax.toFixed(2)}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div className="cx-muted">Delivery fee</div>
                    <div style={{ fontWeight: 950 }}>${receipt.fee.toFixed(2)}</div>
                  </div>

                  <div className="cx-divider" />

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>Total</div>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>${receipt.total.toFixed(2)}</div>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
