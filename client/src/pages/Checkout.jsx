// src/pages/Checkout.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  SS_KEYS,
  lsRead,
  lsWrite,
  uid,
  seedStoreIfMissing,
  readStoreProfile,
  getCustomerUser,
  addCustomerOrder,
  lsReadArray,
  getOrCreateDineInSession,
  closeDineInSession,
  subscribeKey,
  addReceipt,
  buildReceiptFromOrder,
} from "../utils/ssStore";
import "../styles/customerPages.css";

// Leaflet / React Leaflet
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

  // swap if reversed
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

function isLikelyDefaultNorman(latLng) {
  if (!latLng) return true;
  const lat = Number(latLng.lat);
  const lng = Number(latLng.lng);
  return Math.abs(lat - 35.2226) < 0.02 && Math.abs(lng + 97.4395) < 0.02;
}

function formatPhone(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  return digits.slice(0, 15);
}
function isValidPhone(raw) {
  const digits = formatPhone(raw);
  return digits.length >= 10 && digits.length <= 15;
}

// --- Address book (per customer) ---
function addressBookKey(customerKey) {
  return `SS_ADDR_BOOK_${customerKey || "guest"}`;
}
function loadAddressBook(customerKey) {
  try {
    const arr = JSON.parse(localStorage.getItem(addressBookKey(customerKey)) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function saveAddressBook(customerKey, list) {
  localStorage.setItem(addressBookKey(customerKey), JSON.stringify(list || []));
}
function upsertAddress(customerKey, entry) {
  const list = loadAddressBook(customerKey);
  const id = entry.id || uid();
  const next = [{ ...entry, id }, ...list.filter((x) => x.id !== id)];
  saveAddressBook(customerKey, next.slice(0, 10));
  return id;
}

// --- OSM geocode biased near store ---
async function geocodeAddressOSM(q, near /* {lat,lng} */) {
  const base = "https://nominatim.openstreetmap.org/search";
  const delta = 0.25; // ~25km box
  const left = near.lng - delta;
  const right = near.lng + delta;
  const top = near.lat + delta;
  const bottom = near.lat - delta;

  const url =
    `${base}?format=json&limit=1&addressdetails=1&countrycodes=us` +
    `&q=${encodeURIComponent(q)}` +
    `&viewbox=${left},${top},${right},${bottom}` +
    `&bounded=1`;

  const resp = await fetch(url, { headers: { "Accept-Language": "en" } });
  if (!resp.ok) throw new Error("Geocoding failed");
  const data = await resp.json();
  if (!Array.isArray(data) || !data.length) throw new Error("No results");
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

// --- OSRM route ---
async function routeOSRM(from, to) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Routing failed");
  const data = await resp.json();
  if (!data?.routes?.length) throw new Error("No route found");

  const r = data.routes[0];
  const distanceKm = Number((r.distance / 1000).toFixed(2));
  const durationMin = Math.max(1, Math.round(r.duration / 60));
  const polylineLatLngs = r.geometry?.coordinates?.map(([lng, lat]) => [lat, lng]) || [];
  return { distanceKm, durationMin, polylineLatLngs };
}

export default function Checkout() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const mode = String(params.get("mode") || "pickup").toUpperCase(); // PICKUP | DELIVERY | DINE_IN
  const table = Number(params.get("table") || 1);

  const customer = useMemo(() => getCustomerUser(), []);
  const customerKey = useMemo(() => customer?.id || customer?.email || customer?.phone || "", [customer]);

  // Store profile
  const [store, setStore] = useState(() => readStoreProfile());
  useEffect(() => {
    seedStoreIfMissing();
    setStore(readStoreProfile());
    return subscribeKey(SS_KEYS.STORE_PROFILE, () => setStore(readStoreProfile()));
  }, []);

  const deliveryRadiusKm = Number(store?.deliveryRadiusKm || 15);

  // ✅ store coords cached + migrated
  const [storeCoords, setStoreCoords] = useState(() => {
    const n = normalizeLatLng(store?.latLng) || normalizeLatLng(store?.fallbackLatLng);
    return n || { lat: 35.2226, lng: -97.4395 };
  });

  useEffect(() => {
    let cancelled = false;

    async function ensureStoreCoords() {
      try {
        const addr =
          (store?.addressLine || store?.address || "").trim() ||
          "1361 Creekside Dr #2006, Norman, OK 73071";

        const current = normalizeLatLng(store?.latLng) || normalizeLatLng(store?.fallbackLatLng);

        // If coords missing OR still the old default, geocode the address once and cache it.
        if (!current || isLikelyDefaultNorman(current)) {
          const near = current || { lat: 35.2226, lng: -97.4395 };
          const geo = await geocodeAddressOSM(addr, near);

          if (cancelled) return;

          setStoreCoords(geo);

          // Cache into store profile so all pages use correct store marker from now on.
          const nextProfile = {
            ...(store || {}),
            latLng: geo,
            fallbackLatLng: geo,
            addressLine: store?.addressLine || addr,
            address: store?.address || addr,
          };
          lsWrite(SS_KEYS.STORE_PROFILE, nextProfile);
        } else {
          setStoreCoords(current);
        }
      } catch (e) {
        // If geocode fails, keep whatever we have (don’t break checkout).
        const current = normalizeLatLng(store?.latLng) || normalizeLatLng(store?.fallbackLatLng);
        if (!cancelled && current) setStoreCoords(current);
      }
    }

    ensureStoreCoords();
    return () => {
      cancelled = true;
    };
  }, [store]);

  // CART
  const cartKey = mode === "DINE_IN" ? String(table) : "0";
  const [cartsByTable, setCartsByTable] = useState(() => lsRead(SS_KEYS.CARTS_BY_TABLE, {}) || {});
  const cart = useMemo(() => cartsByTable?.[cartKey] || [], [cartsByTable, cartKey]);
  function setCart(nextCart) {
    const next = { ...(cartsByTable || {}), [cartKey]: nextCart };
    setCartsByTable(next);
    lsWrite(SS_KEYS.CARTS_BY_TABLE, next);
  }

  // Address book UI
  const [addrBook, setAddrBook] = useState(() => loadAddressBook(customerKey));
  useEffect(() => {
    setAddrBook(loadAddressBook(customerKey));
  }, [customerKey]);

  const [selectedAddrId, setSelectedAddrId] = useState("");
  const selectedAddr = useMemo(
    () => addrBook.find((a) => a.id === selectedAddrId) || null,
    [addrBook, selectedAddrId]
  );

  // DELIVERY fields
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [saveThisAddress, setSaveThisAddress] = useState(true);
  const [addressLabel, setAddressLabel] = useState("Home");

  useEffect(() => {
    if (!selectedAddr) return;
    setAddress(selectedAddr.address || "");
    setMobile(selectedAddr.mobile || "");
    setAddressLabel(selectedAddr.label || "Saved");
  }, [selectedAddr]);

  // error + states
  const [err, setErr] = useState("");
  const [confirmErr, setConfirmErr] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [placing, setPlacing] = useState(false);

  const [destCoords, setDestCoords] = useState(null);
  const [routeLine, setRouteLine] = useState([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState(null);
  const [routeEtaMin, setRouteEtaMin] = useState(null);

  useEffect(() => {
    setConfirmErr("");
    setDestCoords(null);
    setRouteLine([]);
    setRouteDistanceKm(null);
    setRouteEtaMin(null);
  }, [address]);

  const cartSubtotal = useMemo(
    () => cart.reduce((sum, it) => sum + (Number(it.price) || 0) * (it.qty || 1), 0),
    [cart]
  );
  const cartTax = useMemo(() => cartSubtotal * Number(store?.taxRate || 0.0875), [cartSubtotal, store]);

  const deliveryFee = useMemo(() => {
    if (mode !== "DELIVERY") return 0;
    if (routeDistanceKm == null) return 0;
    const base = 2.99;
    const perKm = 0.75;
    const raw = base + perKm * Math.max(0, routeDistanceKm);
    return Math.min(12.99, Number(raw.toFixed(2)));
  }, [mode, routeDistanceKm]);

  const cartTotal = useMemo(() => cartSubtotal + cartTax + deliveryFee, [cartSubtotal, cartTax, deliveryFee]);

  const routeSummaryText = useMemo(() => {
    if (mode !== "DELIVERY") return "";
    if (routeDistanceKm == null || routeEtaMin == null) return "";
    return `${routeDistanceKm} km • ~${routeEtaMin} min`;
  }, [mode, routeDistanceKm, routeEtaMin]);

  const mapCenter = useMemo(() => {
    if (destCoords) return [(storeCoords.lat + destCoords.lat) / 2, (storeCoords.lng + destCoords.lng) / 2];
    return [storeCoords.lat, storeCoords.lng];
  }, [storeCoords, destCoords]);

  async function confirmDeliveryAddress() {
    if (mode !== "DELIVERY") return;
    setEstimating(true);

    try {
      setConfirmErr("");
      if (!customer) throw new Error("Delivery requires login.");
      if (!address.trim()) throw new Error("Enter a delivery address.");
      if (!isValidPhone(mobile)) throw new Error("Enter a valid mobile number (10–15 digits).");

      const dest = await geocodeAddressOSM(address.trim(), storeCoords);
      const r = await routeOSRM(storeCoords, dest);

      if (r.distanceKm > deliveryRadiusKm) {
        throw new Error(`Outside delivery radius (${deliveryRadiusKm} km).`);
      }

      setDestCoords(dest);
      setRouteDistanceKm(r.distanceKm);
      setRouteEtaMin(r.durationMin);
      setRouteLine(r.polylineLatLngs);

      if (saveThisAddress && customerKey) {
        const id = upsertAddress(customerKey, {
          label: (addressLabel || "Saved").trim(),
          address: address.trim(),
          mobile: formatPhone(mobile),
          lastUsedAt: new Date().toISOString(),
        });
        setAddrBook(loadAddressBook(customerKey));
        setSelectedAddrId(id);
      }
    } catch (e) {
      setConfirmErr(e?.message || "Could not confirm address.");
      setDestCoords(null);
      setRouteLine([]);
      setRouteDistanceKm(null);
      setRouteEtaMin(null);
    } finally {
      setEstimating(false);
    }
  }

  const deliveryDisabledReason = useMemo(() => {
    if (mode !== "DELIVERY") return "";
    if (!customer) return "Delivery requires login.";
    if (!address.trim()) return "Enter a delivery address.";
    if (!isValidPhone(mobile)) return "Enter a valid mobile number.";
    if (routeDistanceKm == null || routeEtaMin == null || !destCoords) return "Confirm address to get ETA.";
    if (routeDistanceKm > deliveryRadiusKm) return `Outside ${deliveryRadiusKm} km radius.`;
    return "";
  }, [mode, customer, address, mobile, routeDistanceKm, routeEtaMin, destCoords, deliveryRadiusKm]);

  // ✅ PLACE ORDER (Pickup / Delivery) — patched exactly as requested (mapped to existing state vars)
  async function placeOrder() {
    if (!cart.length) return;
    if (placing) return;

    // delivery validation
    const deliveryAddress = address;
    const phone = mobile;
    const dropLatLng = destCoords;

    if (mode === "DELIVERY") {
      if (!deliveryAddress.trim()) return setErr("Enter a delivery address.");
      if (!isValidPhone(phone)) return setErr("Enter a valid mobile number.");
    }

    setErr("");
    setPlacing(true);

    const order = {
      id: uid(),
      createdAt: new Date().toISOString(),
      customerId: customer?.id || customer?.email || customer?.phone || "guest",
      customerName: customer?.name || customer?.email || customer?.phone || "Guest",
      serviceType: mode, // "PICKUP" | "DELIVERY" | "DINE_IN"
      table: mode === "DINE_IN" ? Number(table || 1) : null,

      delivery:
        mode === "DELIVERY"
          ? {
              address: deliveryAddress.trim(),
              phone: formatPhone(phone),
              dropLatLng: dropLatLng || null,
            }
          : null,

      items: cart.map((c) => ({
        id: c.id,
        name: c.name,
        qty: c.qty || 1,
        price: Number(c.price) || 0,
        instructions: c.instructions || "",
      })),

      totals: {
        subtotal: Number(cartSubtotal.toFixed(2)),
        tax: Number(cartTax.toFixed(2)),
        deliveryFee: Number(deliveryFee.toFixed(2)),
        total: Number(cartTotal.toFixed(2)),
        taxRate: Number(store?.taxRate || 0.0875),
      },

      payment: { mode: "card", status: "paid" },
      liveNotes: [],
      eta: mode === "DELIVERY" ? routeEtaMin : null,
    };

    // ✅ Persist order (kitchen/driver/customer all read SS_KEYS.ORDERS)
    const saved = addCustomerOrder(order);

    // ✅ Persist receipt (one checkout = one receipt)
    addReceipt(buildReceiptFromOrder(saved));

    // ✅ clear cart
    setCart([]);
    setTimeout(() => {
      setPlacing(false);
      nav(`/home?mode=${mode.toLowerCase()}`);
    }, 250);
  }

  // DINE-IN BILL MODE
  const dineSession = useMemo(() => {
    if (mode !== "DINE_IN") return null;
    return getOrCreateDineInSession(table);
  }, [mode, table]);

  const dineOrders = useMemo(() => {
    if (mode !== "DINE_IN" || !dineSession?.id) return [];
    const all = lsReadArray(SS_KEYS.ORDERS);
    return all
      .filter((o) => o.serviceType === "DINE_IN" && o.dineInSessionId === dineSession.id && o.billStatus === "OPEN")
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  }, [mode, dineSession]);

  const dineSubtotal = useMemo(() => {
    return dineOrders.reduce((sum, o) => {
      const items = Array.isArray(o.items) ? o.items : [];
      return sum + items.reduce((x, it) => x + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
    }, 0);
  }, [dineOrders]);

  const dineTax = useMemo(() => dineSubtotal * Number(store?.taxRate || 0.0875), [dineSubtotal, store]);
  const dineTotal = useMemo(() => dineSubtotal + dineTax, [dineSubtotal, dineTax]);

  function payAndCloseBill() {
    if (mode !== "DINE_IN" || !dineSession?.id) return;

    const all = lsReadArray(SS_KEYS.ORDERS);
    const next = all.map((o) => {
      if (o.serviceType !== "DINE_IN") return o;
      if (o.dineInSessionId !== dineSession.id) return o;
      if (o.billStatus !== "OPEN") return o;
      return { ...o, billStatus: "PAID" };
    });

    lsWrite(SS_KEYS.ORDERS, next);
    closeDineInSession(dineSession.id);
    nav(`/home?mode=dine_in&table=${table}`);
  }

  return (
    <div className="cx-page">
      <div className="cx-shell">
        <header className="cx-topbar cx-topbar-lux">
          <div>
            <h1 className="cx-title">Checkout</h1>
            <p className="cx-subtitle">
              {store?.name || "SS Authentic Cuisine"}
              {mode === "DINE_IN" ? ` • Dine-in • Table ${table}` : ` • ${mode}`}
              {mode === "DELIVERY" && routeSummaryText ? ` • ${routeSummaryText}` : ""}
            </p>
          </div>

          <div className="cx-topbar-actions">
            <Link className="cx-btn cx-btn-soft cx-tap" to={`/home?mode=${mode.toLowerCase()}`}>
              Back
            </Link>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 14, alignItems: "start" }}>
          {/* LEFT */}
          <div style={{ display: "grid", gap: 14 }}>
            {/* Order summary */}
            <section className="cx-card">
              <div className="cx-card-head">
                <h2>Order summary</h2>
                <div className="cx-muted">
                  Total <b>${cartTotal.toFixed(2)}</b>
                </div>
              </div>

              <div style={{ padding: 14 }}>
                {cart.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {cart.map((it) => (
                      <div key={it.id} className="cx-past-row">
                        <div>
                          <div className="cx-past-title">
                            {it.qty || 1}× {it.name}
                          </div>
                          <div className="cx-muted">${(Number(it.price) || 0).toFixed(2)} each</div>
                        </div>
                        <span className="cx-badge gray">
                          ${(Number(it.price || 0) * Number(it.qty || 1)).toFixed(2)}
                        </span>
                      </div>
                    ))}

                    <div className="cx-divider" />

                    <div className="cx-muted" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Subtotal</span>
                      <b>${cartSubtotal.toFixed(2)}</b>
                    </div>

                    <div className="cx-muted" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Tax</span>
                      <b>${cartTax.toFixed(2)}</b>
                    </div>

                    {mode === "DELIVERY" ? (
                      <div className="cx-muted" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Delivery fee</span>
                        <b>${deliveryFee.toFixed(2)}</b>
                      </div>
                    ) : null}

                    <div className="cx-divider" />

                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900 }}>
                      <span>Total</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="cx-empty">Your cart is empty.</div>
                )}
              </div>
            </section>

            {/* Service */}
            <section className="cx-card">
              <div className="cx-card-head">
                <h2>{mode === "DELIVERY" ? "Delivery" : mode === "DINE_IN" ? "Dine-in bill" : "Pickup"}</h2>
                {mode === "DELIVERY" ? (
                  <div className="cx-muted">
                    Radius <b>{deliveryRadiusKm} km</b>
                  </div>
                ) : null}
              </div>

              <div style={{ padding: 14 }}>
                {mode === "DELIVERY" ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    {customerKey ? (
                      <div>
                        <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 8 }}>
                          Saved addresses
                        </div>
                        <select
                          className="cx-input"
                          value={selectedAddrId}
                          onChange={(e) => setSelectedAddrId(e.target.value)}
                        >
                          <option value="">— Select saved address —</option>
                          {addrBook.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.label || "Saved"} • {a.address}
                            </option>
                          ))}
                        </select>

                        {addrBook.length ? (
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                            <button
                              className="cx-btn cx-btn-soft cx-tap"
                              type="button"
                              onClick={() => {
                                if (!selectedAddrId) return;
                                const next = addrBook.filter((x) => x.id !== selectedAddrId);
                                saveAddressBook(customerKey, next);
                                setAddrBook(next);
                                setSelectedAddrId("");
                              }}
                            >
                              Remove selected
                            </button>
                            <button
                              className="cx-btn cx-btn-soft cx-tap"
                              type="button"
                              onClick={() => {
                                setSelectedAddrId("");
                                setAddress("");
                                setMobile("");
                              }}
                            >
                              New address
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div>
                      <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 8 }}>
                        Delivery address
                      </div>
                      <input
                        className="cx-input"
                        placeholder="Street, City, State ZIP"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 8 }}>
                        Mobile number
                      </div>
                      <input
                        className="cx-input"
                        placeholder="e.g. 4055551234"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                      />
                      <div className="cx-muted" style={{ marginTop: 6 }}>
                        Used for delivery updates.
                      </div>
                    </div>

                    {customerKey ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          padding: 12,
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <div className="cx-muted" style={{ fontWeight: 900 }}>
                          Save this address
                        </div>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            className="cx-input"
                            style={{ maxWidth: 220 }}
                            value={addressLabel}
                            onChange={(e) => setAddressLabel(e.target.value)}
                            placeholder="Home"
                          />
                          <label className="cx-muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input
                              type="checkbox"
                              checked={saveThisAddress}
                              onChange={(e) => setSaveThisAddress(e.target.checked)}
                            />
                            Save
                          </label>
                        </div>
                      </div>
                    ) : null}

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        className="cx-btn cx-btn-soft cx-tap"
                        type="button"
                        onClick={confirmDeliveryAddress}
                        disabled={estimating || placing || !address.trim() || !isValidPhone(mobile)}
                        title={!address.trim() || !isValidPhone(mobile) ? "Enter address + valid phone" : ""}
                      >
                        {estimating ? "Confirming…" : "Confirm address"}
                      </button>

                      <span className="cx-muted">
                        {routeSummaryText ? (
                          <>
                            ETA <b>~{routeEtaMin} min</b>
                          </>
                        ) : (
                          "Confirm to see ETA"
                        )}
                      </span>
                    </div>

                    {confirmErr ? <div className="cx-callout warn">{confirmErr}</div> : null}
                    {err ? <div className="cx-callout warn">{err}</div> : null}

                    <button
                      className="cx-btn cx-btn-primary cx-tap"
                      type="button"
                      onClick={placeOrder}
                      disabled={!cart.length || placing || !!deliveryDisabledReason}
                      title={deliveryDisabledReason || ""}
                    >
                      {placing ? "Placing…" : "Place order"}
                    </button>

                    {deliveryDisabledReason ? <div className="cx-muted">{deliveryDisabledReason}</div> : null}
                  </div>
                ) : mode === "PICKUP" ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div className="cx-muted">Pickup orders are prepared for pickup at the restaurant.</div>
                    {err ? <div className="cx-callout warn">{err}</div> : null}
                    <button
                      className="cx-btn cx-btn-primary cx-tap"
                      type="button"
                      onClick={placeOrder}
                      disabled={!cart.length || placing}
                    >
                      {placing ? "Placing…" : "Place order"}
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div className="cx-muted">
                      Open bill for <b>Table {table}</b>
                    </div>

                    <div className="cx-past">
                      <div className="cx-past-row">
                        <div className="cx-muted">Subtotal</div>
                        <span className="cx-badge gray">${dineSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="cx-past-row">
                        <div className="cx-muted">Tax</div>
                        <span className="cx-badge gray">${dineTax.toFixed(2)}</span>
                      </div>
                      <div className="cx-past-row">
                        <div style={{ fontWeight: 900 }}>Total</div>
                        <span className="cx-badge gray">${dineTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      className="cx-btn cx-btn-primary cx-tap"
                      type="button"
                      onClick={payAndCloseBill}
                      disabled={!dineOrders.length}
                      title={!dineOrders.length ? "No open bill yet" : ""}
                    >
                      Pay &amp; close bill
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT: Map */}
          <section className="cx-card">
            <div className="cx-card-head">
              <h2>Live route</h2>
              <div className="cx-muted">{mode === "DELIVERY" ? (routeSummaryText || "Confirm address") : "Preview"}</div>
            </div>

            <div style={{ padding: 14 }}>
              <div className="cx-map" style={{ height: 420 }}>
                <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <Marker position={[storeCoords.lat, storeCoords.lng]}>
                    <Popup>
                      <b>{store?.name || "Restaurant"}</b>
                      <div className="cx-muted" style={{ marginTop: 4 }}>
                        Dispatch location
                      </div>
                    </Popup>
                  </Marker>

                  {destCoords ? (
                    <Marker position={[destCoords.lat, destCoords.lng]}>
                      <Popup>
                        <b>Destination</b>
                        <div className="cx-muted" style={{ marginTop: 4 }}>
                          {address.trim() || "Delivery address"}
                        </div>
                      </Popup>
                    </Marker>
                  ) : null}

                  {routeLine?.length ? <Polyline positions={routeLine} /> : null}
                </MapContainer>
              </div>

              <div style={{ marginTop: 12 }} className="cx-muted">
                {mode === "DELIVERY" ? (
                  routeEtaMin != null ? (
                    <>
                      ETA <b>~{routeEtaMin} min</b> • Distance <b>{routeDistanceKm} km</b> • Fee{" "}
                      <b>${deliveryFee.toFixed(2)}</b>
                    </>
                  ) : (
                    <>Enter your address and confirm to see route + ETA.</>
                  )
                ) : mode === "DINE_IN" ? (
                  <>Dine-in bill mode — checkout closes your table session.</>
                ) : (
                  <>Pickup mode — no route needed.</>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
