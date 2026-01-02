// src/pages/KitchenOrders.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../styles/kitchenOrders.css";
import { SS_KEYS, lsReadArray, lsWrite, subscribeKey, uid, money } from "../utils/ssStore";

/* ---------------------- helpers ---------------------- */

const ORDER_STATUS = {
  PLACED: "PLACED",
  ACCEPTED: "ACCEPTED",
  COOKING: "COOKING",
  READY: "READY",
  SERVED: "SERVED",
  CANCELLED: "CANCELLED",
};

function readOrders() {
  return lsReadArray(SS_KEYS.ORDERS);
}

function writeOrders(next) {
  lsWrite(SS_KEYS.ORDERS, next);
}

function patchOrder(orderId, patch) {
  const all = readOrders();
  const next = all.map((o) => (o.id === orderId ? { ...o, ...patch } : o));
  writeOrders(next);
  return next;
}

function addOrderMessage(orderId, from, text) {
  const all = readOrders();
  const next = all.map((o) => {
    if (o.id !== orderId) return o;
    const liveNotes = Array.isArray(o.liveNotes) ? o.liveNotes : [];
    return {
      ...o,
      liveNotes: [...liveNotes, { id: uid(), from, text, at: new Date().toISOString() }],
    };
  });
  writeOrders(next);
  return next;
}

function setOrderETA(orderId, minutes) {
  const eta = { minutes: Number(minutes || 0), setAtISO: new Date().toISOString() };
  return patchOrder(orderId, { eta });
}

function calcOrderSubtotal(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
}

function remainingMsFromEta(eta, nowMs) {
  if (!eta?.minutes || !eta?.setAtISO) return 0;
  const start = new Date(eta.setAtISO).getTime();
  const end = start + Number(eta.minutes) * 60 * 1000;
  return Math.max(0, end - nowMs);
}

function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function statusChipTone(status) {
  if (status === ORDER_STATUS.READY) return "amber";
  if (status === ORDER_STATUS.COOKING) return "blue";
  if (status === ORDER_STATUS.ACCEPTED) return "indigo";
  if (status === ORDER_STATUS.SERVED) return "green";
  if (status === ORDER_STATUS.CANCELLED) return "gray";
  return "gray";
}

/* ---------------------- main ---------------------- */

export default function KitchenOrders() {
  const [orders, setOrders] = useState(() => readOrders());
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState({ q: "", table: "ALL", service: "ALL" });

  // live refresh (same tab + other tabs)
  useEffect(() => subscribeKey(SS_KEYS.ORDERS, () => setOrders(readOrders())), []);

  function showToast(msg) {
    setToast(msg);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(""), 1150);
  }

  function onRefresh() {
    setOrders(readOrders());
    showToast("Refreshed");
  }

  const filteredOrders = useMemo(() => {
    const q = (filter.q || "").trim().toLowerCase();
    return (orders || []).filter((o) => {
      const matchesQ =
        !q ||
        String(o.id || "").toLowerCase().includes(q) ||
        String(o.table || "").toLowerCase().includes(q) ||
        String(o.serviceType || "").toLowerCase().includes(q) ||
        (Array.isArray(o.items) ? o.items.some((it) => String(it.name || "").toLowerCase().includes(q)) : false);

      const matchesTable = filter.table === "ALL" ? true : String(o.table || "") === String(filter.table);
      const matchesService = filter.service === "ALL" ? true : String(o.serviceType || "") === String(filter.service);

      return matchesQ && matchesTable && matchesService;
    });
  }, [orders, filter.q, filter.table, filter.service]);

  const activeOrders = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status !== ORDER_STATUS.SERVED && o.status !== ORDER_STATUS.CANCELLED)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [filteredOrders]);

  const servedOrders = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status === ORDER_STATUS.SERVED || o.status === ORDER_STATUS.CANCELLED)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [filteredOrders]);

  const metrics = useMemo(() => {
    const counts = { PLACED: 0, ACCEPTED: 0, COOKING: 0, READY: 0 };
    for (const o of activeOrders) {
      const s = o.status || ORDER_STATUS.PLACED;
      if (counts[s] !== undefined) counts[s] += 1;
    }
    return counts;
  }, [activeOrders]);

  const tables = useMemo(() => {
    const set = new Set();
    for (const o of orders || []) if (o.table != null) set.add(String(o.table));
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [orders]);

  return (
    <div className="ko-page">
      <div className="ko-shell">
        <header className="ko-top ko-glass">
          <div>
            <h1 className="ko-title">Kitchen</h1>
            <p className="ko-subtitle">Accept • ETA • Status • Message • Track</p>

            <div className="ko-metrics" aria-label="Kitchen metrics">
              <span className="ko-metric ko-metric-placed">
                Placed: <b>{metrics.PLACED}</b>
              </span>
              <span className="ko-metric ko-metric-accepted">
                Accepted: <b>{metrics.ACCEPTED}</b>
              </span>
              <span className="ko-metric ko-metric-cooking">
                Cooking: <b>{metrics.COOKING}</b>
              </span>
              <span className="ko-metric ko-metric-ready">
                Ready: <b>{metrics.READY}</b>
              </span>
            </div>
          </div>

          <div className="ko-actions">
            <button className="ko-btn ko-btn-ghost ko-tap ko-ripple" onClick={onRefresh} type="button">
              ↻ Refresh
            </button>
            <Link className="ko-btn ko-btn-ghost ko-tap ko-ripple" to="/owner-dashboard">
              ← Dashboard
            </Link>
          </div>
        </header>

        {/* Filters */}
        <section className="ko-card ko-filter">
          <div className="ko-filter-row">
            <div className="ko-filter-title">Live queue</div>

            <div className="ko-filter-controls">
              <input
                className="ko-input ko-input-search"
                value={filter.q}
                onChange={(e) => setFilter((s) => ({ ...s, q: e.target.value }))}
                placeholder="Search order #, item, table…"
              />

              <select
                className="ko-select"
                value={filter.table}
                onChange={(e) => setFilter((s) => ({ ...s, table: e.target.value }))}
                aria-label="Filter by table"
              >
                <option value="ALL">All tables</option>
                {tables.map((t) => (
                  <option key={t} value={t}>
                    Table {t}
                  </option>
                ))}
              </select>

              <select
                className="ko-select"
                value={filter.service}
                onChange={(e) => setFilter((s) => ({ ...s, service: e.target.value }))}
                aria-label="Filter by service type"
              >
                <option value="ALL">All services</option>
                <option value="DINE_IN">Dine-in</option>
                <option value="PICKUP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>
          </div>

          <div className="ko-muted">
            {activeOrders.length} active • {servedOrders.length} history
          </div>
        </section>

        {toast ? <div className="ko-toast">{toast}</div> : null}

        <section className="ko-card">
          <div className="ko-card-head">
            <h2>Active orders</h2>
            <div className="ko-muted">{activeOrders.length} active</div>
          </div>

          {activeOrders.length === 0 ? (
            <div className="ko-empty">No active orders right now.</div>
          ) : (
            <div className="ko-list">
              {activeOrders.map((o) => (
                <OrderCard key={o.id} order={o} onToast={showToast} setOrders={setOrders} />
              ))}
            </div>
          )}
        </section>

        <section className="ko-card">
          <div className="ko-card-head">
            <h2>Served history</h2>
            <div className="ko-muted">{servedOrders.length} shown</div>
          </div>

          {servedOrders.length === 0 ? (
            <div className="ko-empty">No served history yet.</div>
          ) : (
            <div className="ko-list ko-list-tight">
              {servedOrders.slice(0, 12).map((o) => (
                <div key={o.id} className="ko-history ko-tap ko-ripple">
                  <div>
                    <div className="ko-history-title">
                      #{o.id.slice(0, 6)} • Table {o.table || "—"}
                    </div>
                    <div className="ko-muted">{new Date(o.createdAt).toLocaleString()}</div>
                  </div>
                  <span className={`ko-badge ${statusChipTone(o.status)}`}>{o.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ---------------------- Order Card ---------------------- */

function OrderCard({ order, onToast, setOrders }) {
  const [etaPick, setEtaPick] = useState(null);
  const [customEta, setCustomEta] = useState("");
  const [msg, setMsg] = useState("");

  // ✅ local clock → no prop tick, no eslint warnings, updates every second
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // optional “READY” sound cue (plays once per transition)
  const lastStatusRef = useRef(order?.status);
  useEffect(() => {
    const prev = lastStatusRef.current;
    const next = order?.status;
    if (prev !== next && next === ORDER_STATUS.READY) {
      try {
        // lightweight beep using WebAudio (no assets needed)
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = 880;
          g.gain.value = 0.04;
          o.connect(g);
          g.connect(ctx.destination);
          o.start();
          setTimeout(() => {
            o.stop();
            ctx.close?.();
          }, 140);
        }
      } catch {
        // ignore
      }
    }
    lastStatusRef.current = next;
  }, [order?.status]);

  const subtotal = useMemo(() => calcOrderSubtotal(order), [order]);

  const etaMinutes = order?.eta?.minutes ?? 0;
  const etaSetAtISO = order?.eta?.setAtISO ?? "";

  const etaUI = useMemo(() => {
    if (!etaMinutes || !etaSetAtISO) {
      return { countdown: "", progress: 0, urgent: false, done: false, leftMs: 0 };
    }

    const totalMs = etaMinutes * 60 * 1000;
    const leftMs = remainingMsFromEta({ minutes: etaMinutes, setAtISO: etaSetAtISO }, nowMs);
    const done = leftMs <= 0;

    const elapsed = clamp(totalMs - leftMs, 0, totalMs);
    const progress = totalMs > 0 ? elapsed / totalMs : 0;

    const urgent = !done && leftMs <= 2 * 60 * 1000; // last 2 minutes
    return {
      countdown: leftMs ? formatCountdown(leftMs) : "",
      progress,
      urgent,
      done,
      leftMs,
    };
  }, [etaMinutes, etaSetAtISO, nowMs]);

  const etaLabel = useMemo(() => {
    if (!etaMinutes || !etaSetAtISO) return "Waiting for kitchen ETA…";
    return etaUI.countdown ? `ETA: ${etaUI.countdown}` : "ETA reached — finishing…";
  }, [etaMinutes, etaSetAtISO, etaUI.countdown]);

  const status = order.status || ORDER_STATUS.PLACED;

  function updateOrdersState(next) {
    setOrders(next);
  }

  function setStatus(nextStatus) {
    const next = patchOrder(order.id, { status: nextStatus });
    updateOrdersState(next);
    onToast(`Status → ${nextStatus}`);
  }

  function setEta(minutes) {
    if (!minutes || Number(minutes) <= 0) return;
    const next = setOrderETA(order.id, Number(minutes));
    updateOrdersState(next);
    setEtaPick(Number(minutes));
    onToast(`ETA set to ${minutes}m`);
  }

  function sendMsg() {
    const text = msg.trim();
    if (!text) return;
    const next = addOrderMessage(order.id, "Kitchen", text);
    updateOrdersState(next);
    setMsg("");
    onToast("Message sent");
  }

  const cardClass = [
    "ko-order",
    "ko-enter",
    etaUI.urgent ? "ko-urgent" : "",
    status === ORDER_STATUS.READY ? "ko-readyPulse" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cardClass} data-order-id={order.id}>
      <div className="ko-order-top">
        <div>
          <div className="ko-order-title">
            Order #{order.id.slice(0, 6)} • Table {order.table || "—"}
          </div>

          {/* ✅ service details */}
          <div className="ko-muted ko-serviceLine">
            {order.serviceType || "—"}
            {order.serviceType === "DINE_IN"
              ? ` • Table ${order.table} • Bill: ${order.billStatus || "OPEN"}`
              : ""}
            {order.serviceType === "DELIVERY" ? ` • ${order.delivery?.distanceKm ?? "?"} km` : ""}
          </div>

          <div className="ko-muted ko-eta">{etaLabel}</div>

          {etaMinutes && etaSetAtISO ? (
            <div className="ko-progress" aria-label="ETA progress">
              <div
                className={`ko-progress-bar ${etaUI.urgent ? "urgent" : ""}`}
                style={{ width: `${Math.round(etaUI.progress * 100)}%` }}
              />
            </div>
          ) : null}
        </div>

        <div className={`ko-badge ${statusChipTone(status)}`}>{status}</div>
      </div>

      <div className="ko-items">
        {(order.items || []).map((it) => (
          <div key={it.id} className="ko-item">
            <div>
              <b>{it.qty || 1}×</b> {it.name}
              {it.instructions ? <div className="ko-muted">“{it.instructions}”</div> : null}
            </div>
            <div className="ko-muted">{money((Number(it.price) || 0) * (Number(it.qty) || 1))}</div>
          </div>
        ))}
      </div>

      <div className="ko-total">
        <span>Total</span>
        <b>{money(subtotal)}</b>
      </div>

      {/* ETA */}
      <div className="ko-row">
        <div className="ko-row-label">ETA presets:</div>
        <div className="ko-pills">
          {[10, 15, 20, 30, 45].map((m) => (
            <button
              key={m}
              className={`ko-pill ko-tap ko-ripple ${etaPick === m ? "active" : ""}`}
              onClick={() => setEta(m)}
              type="button"
              aria-pressed={etaPick === m}
            >
              {m}m
            </button>
          ))}

          <input
            className="ko-input ko-input-small"
            value={customEta}
            onChange={(e) => setCustomEta(e.target.value)}
            placeholder="Custom"
            inputMode="numeric"
          />

          <button
            className="ko-btn ko-btn-soft ko-tap ko-ripple"
            type="button"
            onClick={() => {
              const m = Number(customEta);
              if (m > 0) setEta(m);
            }}
          >
            Set
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="ko-status">
        <button
          className={`ko-status-btn ko-tap ko-ripple ${status === ORDER_STATUS.ACCEPTED ? "active" : ""}`}
          onClick={() => setStatus(ORDER_STATUS.ACCEPTED)}
          type="button"
          aria-pressed={status === ORDER_STATUS.ACCEPTED}
        >
          Accept
        </button>

        <button
          className={`ko-status-btn ko-tap ko-ripple ${status === ORDER_STATUS.COOKING ? "active" : ""}`}
          onClick={() => setStatus(ORDER_STATUS.COOKING)}
          type="button"
          aria-pressed={status === ORDER_STATUS.COOKING}
        >
          Preparing
        </button>

        <button
          className={`ko-status-btn ko-tap ko-ripple ${status === ORDER_STATUS.READY ? "active" : ""}`}
          onClick={() => setStatus(ORDER_STATUS.READY)}
          type="button"
          aria-pressed={status === ORDER_STATUS.READY}
        >
          Ready
        </button>

        <button
          className={`ko-status-btn danger ko-tap ko-ripple ${status === ORDER_STATUS.SERVED ? "active" : ""}`}
          onClick={() => setStatus(ORDER_STATUS.SERVED)}
          type="button"
          aria-pressed={status === ORDER_STATUS.SERVED}
        >
          Served
        </button>
      </div>

      {/* message */}
      <div className="ko-live">
        <input
          className="ko-input"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="Message customer (out of stock / delay / etc.)"
        />
        <button className="ko-btn ko-btn-primary ko-tap ko-ripple" type="button" onClick={sendMsg}>
          Send
        </button>
      </div>
    </div>
  );
}
