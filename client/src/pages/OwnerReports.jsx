// src/pages/OwnerReports.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.png";
import "../styles/ownerPages.css";
import { SS_KEYS, lsRead, subscribeKey, readReceipts } from "../utils/ssStore";

/** ---------- helpers ---------- */
const asArray = (v) => (Array.isArray(v) ? v : []);
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function isoDay(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}
function addDays(iso, days) {
  const dt = new Date(iso);
  dt.setDate(dt.getDate() + days);
  return isoDay(dt);
}
function clampISO(s) {
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? isoDay() : isoDay(dt);
}
function daysBetweenInclusive(fromISO, toISO) {
  const a = new Date(fromISO);
  const b = new Date(toISO);
  const diff = Math.floor((b.getTime() - a.getTime()) / (24 * 3600 * 1000));
  return Math.max(1, diff + 1);
}
function formatMoney(v) {
  return `$${n(v).toFixed(2)}`;
}
function normalizeService(s) {
  const t = String(s || "").toUpperCase();
  if (t === "DELIVERY") return "DELIVERY";
  if (t === "DINE_IN" || t === "DINE-IN" || t === "DINEIN") return "DINE_IN";
  if (t === "PICKUP" || t === "PICK_UP" || t === "TAKEAWAY") return "PICKUP";
  return "OTHER";
}
function hoursBetween(startHHMM, endHHMM) {
  if (!startHHMM || !endHHMM) return 0;
  const [sh, sm] = String(startHHMM).split(":").map((x) => parseInt(x, 10));
  const [eh, em] = String(endHHMM).split(":").map((x) => parseInt(x, 10));
  if (![sh, sm, eh, em].every((x) => Number.isFinite(x))) return 0;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  const mins = end - start;
  return mins > 0 ? mins / 60 : 0;
}
function pctChange(curr, prev) {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}
function downloadCSV(filename, rows) {
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const header = Object.keys(rows[0] || {});
  const csv = [
    header.map(esc).join(","),
    ...rows.map((r) => header.map((k) => esc(r[k])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** ---------- tiny charts (no deps) ---------- */
function LineChart({ data, height = 120 }) {
  // data: [{xLabel, y}]
  const w = 520;
  const h = height;
  const pad = 10;

  const ys = data.map((d) => n(d.y));
  const maxY = Math.max(1, ...ys);
  const minY = Math.min(...ys, 0);

  const xStep = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = pad + i * xStep;
    const yNorm = (n(d.y) - minY) / (maxY - minY || 1);
    const y = h - pad - yNorm * (h - pad * 2);
    return { x, y };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  const last = data[data.length - 1]?.y ?? 0;

  return (
    <div className="op-chart">
      <div className="op-charthead">
        <b>Daily sales trend</b>
        <span>Last point: {formatMoney(last)}</span>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Sales line chart">
        {/* grid */}
        <line x1="10" y1={h - 10} x2={w - 10} y2={h - 10} stroke="rgba(15,23,42,0.12)" />
        <line x1="10" y1="10" x2="10" y2={h - 10} stroke="rgba(15,23,42,0.10)" />

        {/* area fill */}
        <path
          d={`${path} L ${points[points.length - 1]?.x ?? 10} ${h - 10} L 10 ${h - 10} Z`}
          fill="rgba(37,99,235,0.10)"
        />
        {/* line */}
        <path d={path} fill="none" stroke="rgba(37,99,235,0.85)" strokeWidth="3" strokeLinecap="round" />

        {/* points */}
        {points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r="3.5" fill="rgba(29,78,216,0.9)" />
        ))}
      </svg>

      <div className="op-muted" style={{ marginTop: 8 }}>
        {data.length ? `${data[0].xLabel} → ${data[data.length - 1].xLabel}` : "No data"}
      </div>
    </div>
  );
}

function Donut({ parts }) {
  // parts: [{label, value}]
  const total = parts.reduce((s, p) => s + n(p.value), 0) || 1;
  const r = 44;
  const c = 2 * Math.PI * r;

  // fixed palette via CSS-like rgba values (no CSS vars needed)
  const colors = [
    "rgba(37,99,235,0.85)",   // blue
    "rgba(245,158,11,0.85)",  // amber
    "rgba(22,163,74,0.85)",   // green
    "rgba(239,68,68,0.75)",   // red-ish (other)
  ];

  let acc = 0;
  const segs = parts.map((p, i) => {
    const v = n(p.value);
    const frac = v / total;
    const dash = frac * c;
    const gap = c - dash;
    const offset = c * (1 - acc);
    acc += frac;
    return { ...p, dash, gap, offset, color: colors[i % colors.length], pct: frac * 100 };
  });

  return (
    <div className="op-chart">
      <div className="op-charthead">
        <b>Service mix</b>
        <span>Total: {formatMoney(total)}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12, alignItems: "center" }}>
        <svg width="150" height="150" viewBox="0 0 120 120" role="img" aria-label="Service donut chart">
          <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(15,23,42,0.10)" strokeWidth="14" />
          {segs.map((s, idx) => (
            <circle
              key={idx}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeDasharray={`${s.dash} ${s.gap}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              transform="rotate(-90 60 60)"
            />
          ))}
          <circle cx="60" cy="60" r="28" fill="rgba(255,255,255,0.92)" />
          <text x="60" y="58" textAnchor="middle" fontSize="11" fontWeight="900" fill="rgba(15,23,42,0.78)">
            TOTAL
          </text>
          <text x="60" y="74" textAnchor="middle" fontSize="12" fontWeight="950" fill="rgba(15,23,42,0.92)">
            {formatMoney(total)}
          </text>
        </svg>

        <div style={{ display: "grid", gap: 10 }}>
          {segs.map((s, idx) => (
            <div key={idx} className="op-rowline">
              <div>
                <div style={{ fontWeight: 950 }}>{s.label}</div>
                <div className="op-muted">{s.pct.toFixed(1)}%</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 950 }}>{formatMoney(s.value)}</div>
                <div className="op-bar" style={{ marginTop: 6 }}>
                  <i style={{ "--w": `${Math.max(0, Math.min(100, s.pct))}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BarList({ title, items }) {
  const max = Math.max(1, ...items.map((x) => n(x.value)));
  return (
    <div className="op-chart">
      <div className="op-charthead">
        <b>{title}</b>
        <span>Top {items.length}</span>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {items.length === 0 ? (
          <div className="op-empty">No data</div>
        ) : (
          items.map((it, idx) => {
            const w = (n(it.value) / max) * 100;
            return (
              <div key={idx} className="op-rowline">
                <div style={{ minWidth: 220 }}>
                  <div style={{ fontWeight: 950 }}>{it.label}</div>
                  {it.sub ? <div className="op-muted">{it.sub}</div> : null}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div className="op-muted">{it.rightHint || ""}</div>
                    <div style={{ fontWeight: 950 }}>{formatMoney(it.value)}</div>
                  </div>
                  <div className="op-bar" style={{ marginTop: 8 }}>
                    <i style={{ "--w": `${Math.max(0, Math.min(100, w))}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function OwnerReports() {
  /** Sales source of truth */
  const [receipts, setReceipts] = useState(() => asArray(readReceipts()));

  /** Existing modules (keep) */
  const [timesheets, setTimesheets] = useState(() => asArray(lsRead(SS_KEYS.TIMESHEET_REQUESTS, [])));
  const [leaves, setLeaves] = useState(() => asArray(lsRead(SS_KEYS.LEAVE_REQUESTS, [])));
  const [shifts, setShifts] = useState(() => asArray(lsRead(SS_KEYS.SHIFTS, [])));
  const [employees] = useState(() => asArray(lsRead(SS_KEYS.EMPLOYEES, [])));

  /** Filters */
  const [serviceFilter, setServiceFilter] = useState("ALL"); // ALL | DELIVERY | DINE_IN | PICKUP | OTHER

  const today = isoDay();

  // Date range defaults = last 30 days
  const [fromISO, setFromISO] = useState(addDays(today, -29));
  const [toISO, setToISO] = useState(today);

  useEffect(() => {
    setReceipts(asArray(readReceipts()));
    const unsubReceipts = subscribeKey(SS_KEYS.RECEIPTS, () => setReceipts(asArray(readReceipts())));

    const unsubTS = subscribeKey(SS_KEYS.TIMESHEET_REQUESTS, () =>
      setTimesheets(asArray(lsRead(SS_KEYS.TIMESHEET_REQUESTS, [])))
    );
    const unsubLeaves = subscribeKey(SS_KEYS.LEAVE_REQUESTS, () =>
      setLeaves(asArray(lsRead(SS_KEYS.LEAVE_REQUESTS, [])))
    );
    const unsubShifts = subscribeKey(SS_KEYS.SHIFTS, () => setShifts(asArray(lsRead(SS_KEYS.SHIFTS, []))));

    return () => {
      unsubReceipts?.();
      unsubTS?.();
      unsubLeaves?.();
      unsubShifts?.();
    };
  }, []);

  const refresh = () => {
    setReceipts(asArray(readReceipts()));
    setTimesheets(asArray(lsRead(SS_KEYS.TIMESHEET_REQUESTS, [])));
    setLeaves(asArray(lsRead(SS_KEYS.LEAVE_REQUESTS, [])));
    setShifts(asArray(lsRead(SS_KEYS.SHIFTS, [])));
  };

  /** Normalize receipts once */
  const receiptRowsAll = useMemo(() => {
    return asArray(receipts)
      .map((r) => {
        const createdAt = r?.createdAt ? new Date(r.createdAt) : null;
        const dateISO = createdAt && !Number.isNaN(createdAt.getTime()) ? isoDay(createdAt) : null;
        const service = normalizeService(r?.serviceType);
        return {
          ...r,
          __dateISO: dateISO,
          __total: n(r?.total ?? r?.totals?.total ?? r?.totals?.grandTotal),
          __tax: n(r?.tax ?? r?.totals?.tax),
          __fee: n(r?.fee ?? r?.totals?.deliveryFee),
          __subtotal: n(r?.subtotal ?? r?.totals?.subtotal),
          __serviceType: service,
        };
      })
      .filter((r) => r.__dateISO);
  }, [receipts]);

  /** clamp & validate range */
  const from = useMemo(() => clampISO(fromISO), [fromISO]);
  const to = useMemo(() => clampISO(toISO), [toISO]);

  const rangeDays = useMemo(() => daysBetweenInclusive(from, to), [from, to]);

  const prevFrom = useMemo(() => addDays(from, -rangeDays), [from, rangeDays]);
  const prevTo = useMemo(() => addDays(to, -rangeDays), [to, rangeDays]);

  const inRange = (r, a, b) => r.__dateISO >= a && r.__dateISO <= b;

  const receiptRows = useMemo(() => {
    const base = receiptRowsAll.filter((r) => inRange(r, from, to));
    if (serviceFilter === "ALL") return base;
    return base.filter((r) => r.__serviceType === serviceFilter);
  }, [receiptRowsAll, from, to, serviceFilter]);

  const receiptRowsPrev = useMemo(() => {
    const base = receiptRowsAll.filter((r) => inRange(r, prevFrom, prevTo));
    if (serviceFilter === "ALL") return base;
    return base.filter((r) => r.__serviceType === serviceFilter);
  }, [receiptRowsAll, prevFrom, prevTo, serviceFilter]);

  /** KPIs */
  const sales = useMemo(() => receiptRows.reduce((s, r) => s + r.__total, 0), [receiptRows]);
  const salesPrev = useMemo(() => receiptRowsPrev.reduce((s, r) => s + r.__total, 0), [receiptRowsPrev]);

  const orders = receiptRows.length;
  const ordersPrev = receiptRowsPrev.length;

  const aov = orders ? sales / orders : 0;
  const aovPrev = ordersPrev ? salesPrev / ordersPrev : 0;

  const salesDelta = sales - salesPrev;
  const salesPct = pctChange(sales, salesPrev);

  const ordersDelta = orders - ordersPrev;
  const ordersPct = pctChange(orders, ordersPrev);

  const aovDelta = aov - aovPrev;
  const aovPct = pctChange(aov, aovPrev);

  /** Service mix from selected range (ALL services, even if filtered, for context) */
  const serviceMix = useMemo(() => {
    const base = receiptRowsAll.filter((r) => inRange(r, from, to));
    const out = { DELIVERY: 0, DINE_IN: 0, PICKUP: 0, OTHER: 0 };
    for (const r of base) out[r.__serviceType] = (out[r.__serviceType] || 0) + r.__total;
    return out;
  }, [receiptRowsAll, from, to]);

  /** Daily series for line chart (fills missing days with 0) */
  const dailySeries = useMemo(() => {
    const map = new Map();
    for (const r of receiptRows) {
      map.set(r.__dateISO, (map.get(r.__dateISO) || 0) + r.__total);
    }
    const out = [];
    for (let i = 0; i < rangeDays; i++) {
      const d = addDays(from, i);
      out.push({ xLabel: d.slice(5), y: map.get(d) || 0 });
    }
    return out;
  }, [receiptRows, from, rangeDays]);

  /** Top items (filtered) */
  const topItems = useMemo(() => {
    const m = new Map();
    for (const r of receiptRows) {
      const items = Array.isArray(r?.items) ? r.items : [];
      for (const it of items) {
        const key = String(it?.name || it?.id || "Item");
        const qty = n(it?.qty || 1);
        const revenue = n(it?.price) * qty;
        const prev = m.get(key) || { name: key, qty: 0, revenue: 0 };
        m.set(key, { name: key, qty: prev.qty + qty, revenue: prev.revenue + revenue });
      }
    }
    return Array.from(m.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [receiptRows]);

  /** Labor / Ops (existing, summarized) */
  const pendingTimesheets = useMemo(
    () => asArray(timesheets).filter((t) => t?.status === "Pending" || t?.status === "Submitted"),
    [timesheets]
  );
  const approvedTimesheets = useMemo(
    () => asArray(timesheets).filter((t) => t?.status === "Accepted"),
    [timesheets]
  );
  const acceptedLeaves = useMemo(() => asArray(leaves).filter((r) => r?.status === "Accepted"), [leaves]);

  // Simple week window = last 7 days in range (or full range if shorter)
  const laborFrom = useMemo(() => addDays(to, -(Math.min(6, rangeDays - 1))), [to, rangeDays]);
  const laborTo = to;

  const scheduledHours = useMemo(() => {
    const list = asArray(shifts).filter((s) => s?.date >= laborFrom && s?.date <= laborTo);
    return list.reduce((sum, s) => sum + hoursBetween(s?.start, s?.end), 0);
  }, [shifts, laborFrom, laborTo]);

  const actualHours = useMemo(() => {
    const list = asArray(approvedTimesheets).filter((t) => (t?.date >= laborFrom && t?.date <= laborTo));
    return list.reduce((sum, t) => sum + n(t?.hours), 0);
  }, [approvedTimesheets, laborFrom, laborTo]);

  const salesPerLaborHour = useMemo(() => {
    const denom = actualHours || scheduledHours || 0;
    if (!denom) return 0;
    // use sales in same window:
    const windowSales = receiptRowsAll
      .filter((r) => r.__dateISO >= laborFrom && r.__dateISO <= laborTo)
      .reduce((s, r) => s + r.__total, 0);
    return windowSales / denom;
  }, [actualHours, scheduledHours, receiptRowsAll, laborFrom, laborTo]);

  /** Alerts */
  const alerts = useMemo(() => {
    const a = [];
    if (receiptRowsAll.length === 0) {
      a.push({ tone: "warn", title: "No sales recorded", msg: "No receipts found yet. Place an order to generate sales." });
    } else if (sales === 0) {
      a.push({ tone: "warn", title: "No sales in selected range", msg: "Try a wider range or check service filters." });
    }

    if (pendingTimesheets.length > 0) a.push({ tone: "info", title: "Timesheets pending", msg: `${pendingTimesheets.length} need review.` });
    if (acceptedLeaves.length > 0) a.push({ tone: "info", title: "Approved leave", msg: `${acceptedLeaves.length} leave request(s) accepted.` });

    if (!a.length) a.push({ tone: "ok", title: "All good", msg: "No major risks detected." });
    return a;
  }, [receiptRowsAll.length, sales, pendingTimesheets.length, acceptedLeaves.length]);

  const exportReceipts = () => {
    const rows = receiptRowsAll
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => ({
        orderId: r.orderId || r.id,
        createdAt: new Date(r.createdAt).toLocaleString(),
        serviceType: r.__serviceType,
        subtotal: r.__subtotal.toFixed(2),
        tax: r.__tax.toFixed(2),
        fee: r.__fee.toFixed(2),
        total: r.__total.toFixed(2),
      }));
    downloadCSV(`receipts_${isoDay()}_ALL.csv`, rows);
  };

  const preset = (days) => {
    const t = isoDay();
    setToISO(t);
    setFromISO(addDays(t, -(days - 1)));
  };

  const recentReceipts = useMemo(() => {
    return receiptRows
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 12);
  }, [receiptRows]);

  return (
    <div className="op-page">
      <div className="op-shell">
        <main className="op-glass op-fade-in">
          <header className="op-topbar">
            <div className="op-brand">
              <img src={logo} alt="SS" />
              <div className="op-title">
                <h1>Reports</h1>
                <p>Sales (receipts) • Trends • Service mix • Top items • Labor snapshot</p>
              </div>
            </div>

            <div className="op-actions" style={{ gap: 10 }}>
              <select
                className="op-select"
                value={serviceFilter}
                onChange={(e) => setServiceFilter(e.target.value)}
                title="Filter selected-range analytics by service"
                style={{ width: 170 }}
              >
                <option value="ALL">All services</option>
                <option value="DELIVERY">Delivery</option>
                <option value="DINE_IN">Dine-in</option>
                <option value="PICKUP">Pickup</option>
                <option value="OTHER">Other</option>
              </select>

              <button className="op-btn op-btn-outline" onClick={exportReceipts}>⭳ Export receipts CSV</button>
              <button className="op-btn op-btn-outline" onClick={refresh}>↻ Refresh</button>
              <Link className="op-btn op-btn-outline" to="/owner-dashboard">← Dashboard</Link>
            </div>
          </header>

          <section className="op-content">
            {/* Filters */}
            <div className="op-card">
              <h2>Analytics range</h2>

              <div className="op-row" style={{ alignItems: "end" }}>
                <div>
                  <label>From</label>
                  <input className="op-input" type="date" value={from} onChange={(e) => setFromISO(e.target.value)} />
                </div>
                <div>
                  <label>To</label>
                  <input className="op-input" type="date" value={to} onChange={(e) => setToISO(e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <button className="op-btn op-btn-outline" type="button" onClick={() => preset(7)}>Last 7 days</button>
                <button className="op-btn op-btn-outline" type="button" onClick={() => preset(14)}>Last 14 days</button>
                <button className="op-btn op-btn-outline" type="button" onClick={() => preset(30)}>Last 30 days</button>
                <button className="op-btn op-btn-outline" type="button" onClick={() => preset(90)}>Last 90 days</button>
                <span className="op-badge blue">Range: {from} → {to} ({rangeDays} days)</span>
                <span className="op-badge amber">Compare: {prevFrom} → {prevTo}</span>
              </div>
            </div>

            {/* KPIs */}
            <div className="op-kpis">
              <div className="op-kpi">
                <div className="label">Sales (selected)</div>
                <div className="value">{formatMoney(sales)}</div>
                <div className="sub" style={{ fontWeight: 900 }}>
                  Δ {formatMoney(salesDelta)} ({salesPct.toFixed(1)}%)
                </div>
              </div>
              <div className="op-kpi">
                <div className="label">Orders</div>
                <div className="value">{orders}</div>
                <div className="sub" style={{ fontWeight: 900 }}>
                  Δ {ordersDelta} ({ordersPct.toFixed(1)}%)
                </div>
              </div>
              <div className="op-kpi">
                <div className="label">Avg order value</div>
                <div className="value">{formatMoney(aov)}</div>
                <div className="sub" style={{ fontWeight: 900 }}>
                  Δ {formatMoney(aovDelta)} ({aovPct.toFixed(1)}%)
                </div>
              </div>
              <div className="op-kpi">
                <div className="label">Service filter</div>
                <div className="value">{serviceFilter}</div>
                <div className="sub">Affects KPIs + charts</div>
              </div>
            </div>

            {/* Alerts */}
            <div className="op-card" style={{ marginTop: 12 }}>
              <h2>Owner alerts</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {alerts.map((x, idx) => (
                  <div key={idx} className={`op-alert ${x.tone}`}>
                    <b>{x.title}:</b> {x.msg}
                  </div>
                ))}
              </div>
            </div>

            {/* Charts row */}
            <div className="op-row" style={{ marginTop: 12 }}>
              <LineChart data={dailySeries} height={130} />

              <Donut
                parts={[
                  { label: "Delivery", value: serviceMix.DELIVERY },
                  { label: "Dine-in", value: serviceMix.DINE_IN },
                  { label: "Pickup", value: serviceMix.PICKUP },
                  { label: "Other", value: serviceMix.OTHER },
                ]}
              />
            </div>

            {/* Top items + Labor */}
            <div className="op-row" style={{ marginTop: 12 }}>
              <BarList
                title={`Top items (${serviceFilter === "ALL" ? "all services" : serviceFilter})`}
                items={topItems.map((x) => ({
                  label: x.name,
                  sub: `${x.qty} sold`,
                  value: x.revenue,
                  rightHint: "Revenue",
                }))}
              />

              <div className="op-chart">
                <div className="op-charthead">
                  <b>Labor snapshot</b>
                  <span>{laborFrom} → {laborTo}</span>
                </div>

                <div className="op-grid-2" style={{ marginTop: 10 }}>
                  <div className="op-kpi" style={{ margin: 0 }}>
                    <div className="label">Scheduled hours</div>
                    <div className="value">{scheduledHours.toFixed(1)}h</div>
                  </div>
                  <div className="op-kpi" style={{ margin: 0 }}>
                    <div className="label">Actual hours</div>
                    <div className="value">{actualHours.toFixed(1)}h</div>
                  </div>
                  <div className="op-kpi" style={{ margin: 0 }}>
                    <div className="label">Sales / labor hour</div>
                    <div className="value">{formatMoney(salesPerLaborHour)}</div>
                  </div>
                  <div className="op-kpi" style={{ margin: 0 }}>
                    <div className="label">Employees</div>
                    <div className="value">{employees.length}</div>
                  </div>
                </div>

                <div className="op-divider" />

                <div className="op-muted">
                  Pending timesheets: <b>{pendingTimesheets.length}</b> • Accepted leaves: <b>{acceptedLeaves.length}</b>
                </div>
              </div>
            </div>

            {/* Recent receipts */}
            <div className="op-card" style={{ marginTop: 12 }}>
              <h2>Recent receipts (selected range)</h2>
              <div className="op-muted" style={{ marginTop: 6 }}>
                One checkout = one receipt. Filter affects this list.
              </div>

              <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                {recentReceipts.length === 0 ? (
                  <div className="op-empty">No receipts found for this range/filter.</div>
                ) : (
                  recentReceipts.map((r) => (
                    <div key={r.id} className="op-rowline">
                      <div>
                        <div style={{ fontWeight: 950 }}>
                          #{String(r.orderId || r.id).slice(-8)} • {r.__serviceType}
                        </div>
                        <div className="op-muted">{new Date(r.createdAt).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 950 }}>{formatMoney(r.__total)}</div>
                        <div className="op-muted">Subtotal {formatMoney(r.__subtotal)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* All receipts table (kept) */}
            <div className="op-card" style={{ marginTop: 12 }}>
              <h2>All receipts (source of truth)</h2>
              <div className="op-muted" style={{ marginTop: 6 }}>
                Export CSV for accounting. This table ignores the date/service filters.
              </div>

              <div className="op-table-wrap" style={{ marginTop: 10 }}>
                <table className="op-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Time</th>
                      <th>Service</th>
                      <th>Subtotal</th>
                      <th>Tax</th>
                      <th>Fee</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptRowsAll
                      .slice()
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 60)
                      .map((r) => (
                        <tr key={r.id}>
                          <td>#{String(r.orderId || r.id).slice(-8)}</td>
                          <td>{new Date(r.createdAt).toLocaleString()}</td>
                          <td>{r.__serviceType}</td>
                          <td>{formatMoney(r.__subtotal)}</td>
                          <td>{formatMoney(r.__tax)}</td>
                          <td>{formatMoney(r.__fee)}</td>
                          <td style={{ fontWeight: 950 }}>{formatMoney(r.__total)}</td>
                        </tr>
                      ))}
                    {receiptRowsAll.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="op-empty">No receipts stored yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

          </section>
        </main>
      </div>
    </div>
  );
}
