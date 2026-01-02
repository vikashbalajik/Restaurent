// src/pages/home.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  SS_KEYS,
  lsReadArray,
  lsWrite,
  uid,
  subscribeKey,
  lsRead,
  seedStoreIfMissing,
  readStoreProfile,
  readStoreReviews,
  getCustomerUser,
  logoutCustomer,
  getOrCreateDineInSession,
  readReservations,
  addReservation,
  isTableReserved,
  remainingMsNormalized,
  formatCountdown,
  shouldShowCustomerMap,
  haversineKm,
} from "../utils/ssStore";
import "../styles/customerPages.css";

// ✅ Leaflet (same setup as Checkout)
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in CRA/Webpack
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const API = process.env.REACT_APP_API_BASE || "";

function resolveImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("data:")) return url;
  return `${API}${url}`;
}

function ratingStars(n) {
  const x = Math.max(0, Math.min(5, Number(n || 0)));
  const full = "★".repeat(Math.floor(x));
  const empty = "☆".repeat(5 - Math.floor(x));
  return full + empty;
}

function haptic(ms = 10) {
  try {
    if (navigator?.vibrate) navigator.vibrate(ms);
  } catch {}
}

function toLocalDateTimeInput(d) {
  // YYYY-MM-DDTHH:mm
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(
    x.getMinutes()
  )}`;
}

function normalizeLatLng(x) {
  if (!x) return null;
  let lat = Number(x.lat ?? x.latitude);
  let lng = Number(x.lng ?? x.lon ?? x.longitude);

  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && typeof x === "string") {
    const parts = x.split(",").map((n) => Number(n.trim()));
    if (parts.length === 2) {
      lat = parts[0];
      lng = parts[1];
    }
  }

  const latOk = Number.isFinite(lat) && Math.abs(lat) <= 90;
  const lngOk = Number.isFinite(lng) && Math.abs(lng) <= 180;
  const swappedLatOk = Number.isFinite(lng) && Math.abs(lng) <= 90;
  const swappedLngOk = Number.isFinite(lat) && Math.abs(lat) <= 180;

  if ((!latOk || !lngOk) && swappedLatOk && swappedLngOk) {
    const t = lat;
    lat = lng;
    lng = t;
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function minutesToMs(min) {
  const n = Number(min || 0);
  return Number.isFinite(n) ? n * 60 * 1000 : 0;
}

export default function Home() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const pageViewId = useMemo(() => uid(), []);

  useEffect(() => {
    seedStoreIfMissing();
  }, []);

  const TABLES = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  // ✅ Normalize URL modes
  const [mode, setMode] = useState(() => {
    const raw = String(params.get("mode") || "pickup").toLowerCase();
    if (raw === "delivery") return "DELIVERY";
    if (raw === "dine_in" || raw === "dine-in") return "DINE_IN";
    return "PICKUP";
  });

  const [table, setTable] = useState(() => Number(lsRead("ss_active_table", 1)));
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Picked for you");

  const [menu, setMenu] = useState(() => lsReadArray(SS_KEYS.OWNER_MENU));
  const [cartsByTable, setCartsByTable] = useState(() => lsRead(SS_KEYS.CARTS_BY_TABLE, {}) || {});
  const [toast, setToast] = useState("");

  // ✅ LIVE ORDERS subscription
  const [orders, setOrders] = useState(() => lsReadArray(SS_KEYS.ORDERS));

  // ✅ Orders UI state + tabs
  const [ordersTab, setOrdersTab] = useState("LIVE"); // LIVE | HISTORY
  const [expandedOrderId, setExpandedOrderId] = useState("");

  const [lastAddedId, setLastAddedId] = useState("");
  const [justChangedQtyId, setJustChangedQtyId] = useState("");
  const toastTimerRef = useRef(null);
  const flashTimerRef = useRef(null);
  const qtyTimerRef = useRef(null);

  const store = useMemo(() => readStoreProfile(), []);
  const reviews = useMemo(() => readStoreReviews(), []);
  const customer = useMemo(() => getCustomerUser(), []);

  // ✅ Tick for countdown + “nearby” logic
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // sync store/menu/cart changes
  useEffect(() => subscribeKey(SS_KEYS.OWNER_MENU, () => setMenu(lsReadArray(SS_KEYS.OWNER_MENU))), []);
  useEffect(
    () => subscribeKey(SS_KEYS.CARTS_BY_TABLE, () => setCartsByTable(lsRead(SS_KEYS.CARTS_BY_TABLE, {}) || {})),
    []
  );

  // ✅ subscribe LIVE orders updates
  useEffect(() => {
    setOrders(lsReadArray(SS_KEYS.ORDERS));
    return subscribeKey(SS_KEYS.ORDERS, () => setOrders(lsReadArray(SS_KEYS.ORDERS)));
  }, []);

  useEffect(() => {
    lsWrite("ss_active_table", table);
  }, [table]);

  // persist mode to URL
  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set("mode", String(mode || "pickup").toLowerCase());
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const cartKey = mode === "DINE_IN" ? String(table) : "0";
  const cart = useMemo(() => cartsByTable?.[cartKey] || [], [cartsByTable, cartKey]);

  const categories = useMemo(() => {
    const set = new Set();
    for (const m of menu) set.add((m.category || "").trim());
    const cats = Array.from(set).filter(Boolean).sort();
    return ["Picked for you", "Limited Time Offers", ...cats];
  }, [menu]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) setActiveCategory(categories[0] || "Picked for you");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.join("|")]);

  const filteredMenu = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = menu;

    if (activeCategory && !["Picked for you", "Limited Time Offers"].includes(activeCategory)) {
      list = list.filter((m) => String(m.category || "").trim() === activeCategory);
    }

    if (q) {
      list = list.filter(
        (m) => (m.name || "").toLowerCase().includes(q) || (m.category || "").toLowerCase().includes(q)
      );
    }

    if (activeCategory === "Picked for you") return list.slice(0, 10);
    if (activeCategory === "Limited Time Offers") {
      const offers = list.filter((m) => m.isLimitedTime);
      return offers.length ? offers : list.slice(0, 8);
    }
    return list;
  }, [menu, search, activeCategory]);

  const subtotal = useMemo(
    () => cart.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.qty || 1), 0),
    [cart]
  );

  function setCart(nextCart) {
    const next = { ...(cartsByTable || {}), [cartKey]: nextCart };
    setCartsByTable(next);
    lsWrite(SS_KEYS.CARTS_BY_TABLE, next);
  }

  function showToast(msg, ms = 900) {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(""), ms);
  }

  function flashAdded(id) {
    setLastAddedId(id);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setLastAddedId(""), 650);
  }

  function flashQty(id) {
    setJustChangedQtyId(id);
    if (qtyTimerRef.current) clearTimeout(qtyTimerRef.current);
    qtyTimerRef.current = setTimeout(() => setJustChangedQtyId(""), 450);
  }

  function addToCart(item) {
    const existing = cart.find((c) => c.id === item.id);
    const nextCart = existing
      ? cart.map((c) => (c.id === item.id ? { ...c, qty: (c.qty || 1) + 1 } : c))
      : [
          ...cart,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            imageUrl: item.imageUrl,
            qty: 1,
            instructions: "",
          },
        ];

    setCart(nextCart);
    flashAdded(item.id);
    haptic(12);
    showToast("Added to cart", 900);
  }

  // ✅ updateCartItem removes item if qty <= 0
  function updateCartItem(id, patch) {
    const next = cart
      .map((c) => (c.id === id ? { ...c, ...patch } : c))
      .filter((c) => (Number(c.qty || 0) > 0 ? true : c.id !== id));

    setCart(next);
    flashQty(id);
    haptic(8);
  }

  function removeCartItem(id) {
    setCart(cart.filter((c) => c.id !== id));
    haptic(10);
    showToast("Removed", 700);
  }

  // ✅ Dine-in: place order = send current cart to kitchen as one order
  function placeDineInOrder() {
    if (mode !== "DINE_IN" || cart.length === 0) return;

    const session = getOrCreateDineInSession(table);

    const order = {
      id: uid(),
      status: "PLACED",
      createdAt: new Date().toISOString(),
      serviceType: "DINE_IN",
      table,
      dineInSessionId: session.id,
      billStatus: "OPEN",
      customerId: customer?.id || null,
      guest: !customer,
      items: cart.map((c) => ({
        id: c.id,
        name: c.name,
        qty: c.qty || 1,
        price: Number(c.price) || 0,
        instructions: c.instructions || "",
      })),
      totals: null,
      payment: null,
      liveNotes: [],
      eta: null,
    };

    const all = lsReadArray(SS_KEYS.ORDERS);
    lsWrite(SS_KEYS.ORDERS, [order, ...all]);

    setCart([]);
    showToast("Order sent to kitchen ✅", 900);
  }

  function openCheckout() {
    const qp = new URLSearchParams();
    qp.set("mode", mode.toLowerCase());
    if (mode === "DINE_IN") qp.set("table", String(table));
    nav(`/checkout?${qp.toString()}`);
  }

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    const s = reviews.reduce((a, r) => a + Number(r.rating || 0), 0);
    return Number((s / reviews.length).toFixed(1));
  }, [reviews]);

  // ✅ Reservation UI state
  const [resName, setResName] = useState(customer?.name || "");
  const [resPhone, setResPhone] = useState("");
  const [resStart, setResStart] = useState(() => toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [resDurationMin, setResDurationMin] = useState(60);
  const [reservations, setReservations] = useState(() => readReservations());

  useEffect(() => {
    setReservations(readReservations());
    return subscribeKey(SS_KEYS.RESERVATIONS, () => setReservations(readReservations()));
  }, []);

  function reserveTable() {
    if (mode !== "DINE_IN") return;

    const startISO = new Date(resStart).toISOString();
    const endISO = new Date(new Date(resStart).getTime() + Number(resDurationMin) * 60 * 1000).toISOString();

    if (isTableReserved(table, startISO, endISO)) {
      showToast("That table is already reserved in that slot.", 1200);
      return;
    }

    const out = addReservation({
      table,
      startISO,
      endISO,
      name: resName.trim() || "Guest",
      phone: resPhone.trim(),
    });

    if (!out.ok) {
      showToast(out.error || "Reservation failed", 1200);
      return;
    }

    showToast("Table reserved ✅", 1200);
  }

  const canCheckout = mode !== "DINE_IN" ? cart.length > 0 : true;

  // ✅ Compute active orders (LIVE tracking)
  const activeOrders = useMemo(() => {
    const isActive = (o) =>
      !["SERVED", "COMPLETED", "CANCELLED", "DELIVERED", "PAID"].includes(String(o.status || "").toUpperCase());

    const custId = customer?.id || null;

    const mine = custId ? orders.filter((o) => o.customerId === custId && isActive(o)) : [];

    const dineIn =
      mode === "DINE_IN"
        ? orders.filter((o) => o.serviceType === "DINE_IN" && Number(o.table) === Number(table) && isActive(o))
        : [];

    const map = new Map();
    [...mine, ...dineIn].forEach((o) => map.set(o.id, o));
    return Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [orders, customer, mode, table]);

  // ✅ terminal orders list for history
  const terminalOrders = useMemo(() => {
    const endStatuses = ["SERVED", "COMPLETED", "CANCELLED", "DELIVERED", "PAID"];
    const custId = customer?.id || null;

    const mine = custId ? orders.filter((o) => o.customerId === custId) : [];
    return mine
      .filter((o) => endStatuses.includes(String(o.status || "").toUpperCase()))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [orders, customer]);

  // ✅ Nearby notification (throttled to fire once per active delivery order)
  const nearToastOrderIdRef = useRef("");
  useEffect(() => {
    const nearKm = 0.3;

    const activeDelivery = activeOrders.find((o) => String(o?.serviceType || "").toUpperCase() === "DELIVERY");
    const dest = normalizeLatLng(activeDelivery?.delivery?.coords);
    const driver = normalizeLatLng(activeDelivery?.driver?.lastLatLng);

    if (!activeDelivery?.id || !dest || !driver) return;

    const d = haversineKm(driver, dest);
    if (d <= nearKm && nearToastOrderIdRef.current !== String(activeDelivery.id)) {
      nearToastOrderIdRef.current = String(activeDelivery.id);
      showToast("Your delivery partner is nearby ✨", 1400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, activeOrders.length]);

  // Driver map rendering helpers
  function deliveryMiniMapData(order) {
    const dest = normalizeLatLng(order?.delivery?.coords);
    const driver = normalizeLatLng(order?.driver?.lastLatLng);
    if (!dest && !driver) return null;

    const center = driver || dest;
    const line = driver && dest ? [[driver.lat, driver.lng], [dest.lat, dest.lng]] : [];
    return { dest, driver, center, line };
  }

  return (
    <div className="cx-page" data-page-view-id={pageViewId}>
      <div className="cx-shell">
        <header className="cx-topbar">
          <div>
            <h1 className="cx-title">{store?.name || "Store"}</h1>
            <p className="cx-subtitle">
              {store?.address} • {avgRating} {ratingStars(avgRating)} • {reviews.length}+ reviews
            </p>
          </div>

          <div className="cx-topbar-actions">
            <div className="cx-mode">
              <button
                className={`cx-tab cx-tap ${mode === "PICKUP" ? "active" : ""}`}
                onClick={() => {
                  setMode("PICKUP");
                  haptic(8);
                }}
                type="button"
              >
                Pickup
              </button>
              <button
                className={`cx-tab cx-tap ${mode === "DELIVERY" ? "active" : ""}`}
                onClick={() => {
                  setMode("DELIVERY");
                  haptic(8);
                }}
                type="button"
              >
                Delivery
              </button>
              <button
                className={`cx-tab cx-tap ${mode === "DINE_IN" ? "active" : ""}`}
                onClick={() => {
                  setMode("DINE_IN");
                  haptic(8);
                }}
                type="button"
              >
                Dine-in
              </button>
            </div>

            {mode === "DINE_IN" ? (
              <div className="cx-table">
                <span>Table</span>
                <select value={table} onChange={(e) => setTable(Number(e.target.value))}>
                  {TABLES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div className="cx-auth">
              {customer ? (
                <div className="cx-user">
                  <span className="cx-user-dot" />
                  <span>Hi, {customer.name}</span>
                  <button
                    className="cx-btn cx-btn-soft cx-tap"
                    type="button"
                    style={{ marginLeft: 10 }}
                    onClick={() => {
                      logoutCustomer();
                      showToast("Logged out", 900);
                      nav("/login");
                    }}
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link className="cx-link" to="/login">
                  Log in
                </Link>
              )}
            </div>

            {mode === "DINE_IN" ? (
              <>
                <button
                  className="cx-btn cx-btn-soft cx-tap"
                  onClick={placeDineInOrder}
                  disabled={!cart.length}
                  type="button"
                >
                  Place order
                </button>
                <button
                  className="cx-btn cx-btn-primary cx-tap"
                  onClick={openCheckout}
                  disabled={!canCheckout}
                  type="button"
                >
                  Checkout bill
                </button>
              </>
            ) : (
              <button className="cx-btn cx-btn-primary cx-tap" onClick={openCheckout} disabled={!cart.length} type="button">
                Checkout
              </button>
            )}
          </div>
        </header>

        {toast && <div className="cx-toast cx-pop">{toast}</div>}

        {mode === "DELIVERY" && !customer ? (
          <div className="cx-callout warn">
            Delivery is available only for logged-in customers.{" "}
            <Link className="cx-link" to="/login">
              Log in to enable delivery →
            </Link>
          </div>
        ) : null}

        <div className="cx-grid cx-grid-ubereats">
          {/* SIDEBAR */}
          <aside className="cx-sidebar">
            <div className="cx-side-title">Picked for you</div>
            <nav className="cx-side-nav">
              {categories.map((c) => (
                <button
                  key={c}
                  className={`cx-side-item cx-tap ${activeCategory === c ? "active" : ""}`}
                  type="button"
                  onClick={() => {
                    setActiveCategory(c);
                    haptic(6);
                  }}
                >
                  {c}
                </button>
              ))}
            </nav>
          </aside>

          {/* MENU */}
          <section className="cx-card">
            <div className="cx-card-head">
              <h2>{activeCategory}</h2>
              <input className="cx-search" placeholder="Search menu…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="cx-menu cx-menu-wide">
              {filteredMenu.length === 0 ? (
                <div className="cx-empty">No items found.</div>
              ) : (
                filteredMenu.map((item) => (
                  <div key={item.id} className="cx-menu-item cx-menu-item-wide">
                    <div className="cx-menu-body">
                      <div className="cx-menu-row">
                        <div>
                          <div className="cx-menu-name">{item.name}</div>
                          <div className="cx-menu-meta">{item.category || "Popular"}</div>
                        </div>
                        <div className="cx-price">${Number(item.price || 0).toFixed(2)}</div>
                      </div>

                      <div className="cx-menu-desc">{item.description || "Freshly prepared, authentic taste."}</div>

                      <div className="cx-menu-row">
                        <button
                          className={`cx-btn cx-btn-primary cx-tap ${lastAddedId === item.id ? "cx-pop" : ""}`}
                          onClick={() => addToCart(item)}
                          type="button"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="cx-menu-img">
                      <img alt={item.name} src={resolveImageUrl(item.imageUrl)} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* CART */}
          <aside className="cx-card">
            <div className="cx-card-head">
              <h2>{mode === "DINE_IN" ? `Table ${table} cart` : "Your cart"}</h2>
              <div className="cx-muted">${Number(subtotal || 0).toFixed(2)}</div>
            </div>

            {cart.length === 0 ? (
              <div className="cx-empty">Cart is empty.</div>
            ) : (
              <div className="cx-cart">
                {cart.map((c) => (
                  <div key={c.id} className="cx-cart-row">
                    <div className="cx-cart-main">
                      <div>
                        <div className="cx-cart-name">{c.name}</div>
                        <div className="cx-muted">${Number(c.price || 0).toFixed(2)}</div>
                      </div>
                      <div className="cx-price">${(Number(c.price || 0) * (c.qty || 1)).toFixed(2)}</div>
                    </div>

                    <div className="cx-cart-actions">
                      <button
                        className={`cx-pill cx-tap ${justChangedQtyId === c.id ? "cx-pop" : ""}`}
                        onClick={() => {
                          const q = Number(c.qty || 1);
                          if (q <= 1) removeCartItem(c.id);
                          else updateCartItem(c.id, { qty: q - 1 });
                        }}
                        type="button"
                      >
                        −
                      </button>

                      <div className="cx-qty">{c.qty || 1}</div>

                      <button
                        className={`cx-pill cx-tap ${justChangedQtyId === c.id ? "cx-pop" : ""}`}
                        onClick={() => updateCartItem(c.id, { qty: (c.qty || 1) + 1 })}
                        type="button"
                      >
                        +
                      </button>

                      <button className="cx-pill danger cx-tap" onClick={() => removeCartItem(c.id)} type="button">
                        Remove
                      </button>
                    </div>

                    <div className="cx-cart-note">
                      <input
                        placeholder="Special instructions…"
                        value={c.instructions || ""}
                        onChange={(e) => updateCartItem(c.id, { instructions: e.target.value })}
                      />
                    </div>
                  </div>
                ))}

                <div className="cx-cart-footer">
                  <div className="cx-muted">Subtotal</div>
                  <div className="cx-price">${Number(subtotal || 0).toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* ✅ Dine-in Reservation */}
            {mode === "DINE_IN" ? (
              <>
                <div className="cx-divider" />
                <h3 style={{ margin: "0 0 10px 0" }}>Reserve table</h3>

                <div className="cx-cart-note">
                  <input placeholder="Name" value={resName} onChange={(e) => setResName(e.target.value)} />
                  <input placeholder="Phone (optional)" value={resPhone} onChange={(e) => setResPhone(e.target.value)} />
                  <input type="datetime-local" value={resStart} onChange={(e) => setResStart(e.target.value)} />

                  <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
                    <div className="cx-muted" style={{ minWidth: 120 }}>
                      Duration (min)
                    </div>
                    <input
                      style={{ flex: 1 }}
                      type="number"
                      min={30}
                      step={15}
                      value={resDurationMin}
                      onChange={(e) => setResDurationMin(Number(e.target.value))}
                    />
                  </div>
                </div>

                <button className="cx-btn cx-btn-primary cx-tap" type="button" style={{ marginTop: 10 }} onClick={reserveTable}>
                  Reserve
                </button>

                <div className="cx-divider" />

                <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 8 }}>
                  Upcoming reservations (latest 5)
                </div>
                <div className="cx-past">
                  {reservations
                    .filter((r) => Number(r.table) === Number(table))
                    .slice(0, 5)
                    .map((r) => (
                      <div key={r.id} className="cx-past-row">
                        <div>
                          <div className="cx-past-title">
                            {r.name} • Table {r.table}
                          </div>
                          <div className="cx-muted">
                            {new Date(r.startISO).toLocaleString()} → {new Date(r.endISO).toLocaleTimeString()}
                          </div>
                        </div>
                        <span className="cx-badge gray">Reserved</span>
                      </div>
                    ))}
                  {reservations.filter((r) => Number(r.table) === Number(table)).length === 0 ? (
                    <div className="cx-empty">No reservations for this table yet.</div>
                  ) : null}
                </div>
              </>
            ) : null}
          </aside>
        </div>

        {/* ✅ Orders block (LIVE / HISTORY tabs) */}
        <div className="cx-card" style={{ marginTop: 18 }}>
          <div className="cx-card-head">
            <h2>Orders</h2>

            <div className="cx-mode">
              <button
                className={`cx-tab cx-tap ${ordersTab === "LIVE" ? "active" : ""}`}
                type="button"
                onClick={() => setOrdersTab("LIVE")}
              >
                Live ({activeOrders.length})
              </button>
              <button
                className={`cx-tab cx-tap ${ordersTab === "HISTORY" ? "active" : ""}`}
                type="button"
                onClick={() => setOrdersTab("HISTORY")}
              >
                History ({terminalOrders.length})
              </button>
            </div>
          </div>

          {ordersTab === "LIVE" ? (
            activeOrders.length === 0 ? (
              <div className="cx-empty">No active orders yet.</div>
            ) : (
              <div className="cx-orders-grid">
                {activeOrders.map((o) => {
                  void now;

                  const st = String(o.status || "").toUpperCase();
                  const msLeft = remainingMsNormalized(o);
                  const etaText = msLeft ? formatCountdown(msLeft) : "";

                  // ✅ animated ETA progress
                  const totalMs = o?.eta?.minutes ? minutesToMs(o.eta.minutes) : 0;
                  const progress = totalMs ? Math.min(1, Math.max(0, 1 - msLeft / totalMs)) : 0;

                  // ✅ hide help until terminal
                  const showHelp = ["DELIVERED", "SERVED", "CANCELLED"].includes(st);

                  // ✅ pulse when close to ETA
                  const pulseEta = msLeft > 0 && msLeft <= 2 * 60 * 1000;

                  const isDeliveryOrder = String(o?.serviceType || "").toUpperCase() === "DELIVERY";
                  const mini = isDeliveryOrder ? deliveryMiniMapData(o) : null;

                  const isExpanded = expandedOrderId === o.id;

                  return (
                    <div key={o.id} className="cx-order-card">
                      <div className="cx-order-head">
                        <div>
                          <div className="cx-order-title">
                            #{String(o.id).slice(0, 6)} • {o.serviceType}
                            {o.table ? ` • Table ${o.table}` : ""}
                          </div>

                          {/* ✅ meta line replaced */}
                          <div className="cx-muted">
                            <div className="cx-eta-row">
                              <span>
                                Status <b>{o.status}</b>
                                {etaText ? (
                                  <>
                                    {" • "}
                                    <span className={`cx-eta ${pulseEta ? "pulse" : ""}`}>ETA {etaText}</span>
                                  </>
                                ) : null}
                              </span>

                              {totalMs ? (
                                <span className="cx-eta-mini">
                                  <span className="cx-eta-bar">
                                    <span
                                      className="cx-eta-barFill"
                                      style={{ width: `${Math.round(progress * 100)}%` }}
                                    />
                                  </span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <span className={`cx-status ${st}`}>{o.status}</span>
                      </div>

                      {/* ✅ actions updated: hide Get help unless showHelp */}
                      <div className="cx-order-actions">
                        <button
                          className="cx-btn cx-btn-soft cx-tap"
                          type="button"
                          onClick={() => setExpandedOrderId(isExpanded ? "" : o.id)}
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>

                        <Link className="cx-btn cx-tap" to={`/receipt?orderId=${o.id}`}>
                          Receipt
                        </Link>

                        {showHelp ? (
                          <Link className="cx-btn cx-btn-soft cx-tap" to={`/order-help?orderId=${o.id}`}>
                            Get help
                          </Link>
                        ) : null}
                      </div>

                      {isExpanded ? (
                        <div className="cx-order-details">
                          {o.items?.length ? (
                            <div className="cx-order-items">
                              {o.items.slice(0, 6).map((it) => (
                                <div key={it.id} className="cx-order-item">
                                  <div>
                                    <b>{it.qty || 1}×</b> {it.name}
                                  </div>
                                  <div className="cx-muted">
                                    ${(Number(it.price || 0) * (it.qty || 1)).toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {o.liveNotes?.length ? (
                            <div className="cx-order-note">
                              <span className="cx-muted">Kitchen:</span>{" "}
                              <b>{o.liveNotes[o.liveNotes.length - 1].text}</b>
                            </div>
                          ) : null}

                          {shouldShowCustomerMap(o) && mini ? (
                            <div className="cx-map" style={{ marginTop: 12, height: 240 }}>
                              <MapContainer
                                center={[mini.center.lat, mini.center.lng]}
                                zoom={14}
                                style={{ height: "100%", width: "100%" }}
                              >
                                <TileLayer
                                  attribution="&copy; OpenStreetMap contributors"
                                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                {mini.driver ? <Marker position={[mini.driver.lat, mini.driver.lng]} /> : null}
                                {mini.dest ? <Marker position={[mini.dest.lat, mini.dest.lng]} /> : null}
                                {mini.line?.length ? <Polyline positions={mini.line} /> : null}
                              </MapContainer>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : terminalOrders.length === 0 ? (
            <div className="cx-empty">No past orders yet.</div>
          ) : (
            <div className="cx-orders-grid">
              {terminalOrders.slice(0, 12).map((o) => {
                const st = String(o.status || "").toUpperCase();
                return (
                  <div key={o.id} className="cx-order-card cx-order-card-compact">
                    <div className="cx-order-head">
                      <div>
                        <div className="cx-order-title">
                          #{String(o.id).slice(0, 6)} • {o.serviceType}
                        </div>
                        <div className="cx-muted">{new Date(o.createdAt).toLocaleString()}</div>
                      </div>
                      <span className={`cx-status ${st}`}>{o.status}</span>
                    </div>

                    <div className="cx-order-actions">
                      <Link className="cx-btn cx-tap" to={`/receipt?orderId=${o.id}`}>
                        Receipt
                      </Link>
                      <Link className="cx-btn cx-btn-soft cx-tap" to={`/order-help?orderId=${o.id}`}>
                        Get help
                      </Link>
                    </div>

                    {st === "DELIVERED" && o?.driver?.deliveredPhoto ? (
                      <img src={o.driver.deliveredPhoto} alt="Delivery proof" className="cx-proof-thumb" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
