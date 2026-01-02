// src/pages/DeliveryPartner.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  SS_KEYS,
  lsReadArray,
  subscribeKey,
  readStoreProfile,
  setDriverSession,
  getDriverSession,
  assignDriverToOrder,
  markPickedUp,
  setDriverLocationOnOrder,
  markOrderDelivered,
  haversineKm,
  normalizeStatus,
  isDelivery,
} from "../utils/ssStore";
import "../styles/customerPages.css";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function DeliveryPartner() {
  const store = useMemo(() => readStoreProfile(), []);
  const storeCoords = store?.latLng || store?.fallbackLatLng || { lat: 35.2226, lng: -97.4395 };

  const [orders, setOrders] = useState(() => lsReadArray(SS_KEYS.ORDERS));
  useEffect(() => {
    setOrders(lsReadArray(SS_KEYS.ORDERS));
    return subscribeKey(SS_KEYS.ORDERS, () => setOrders(lsReadArray(SS_KEYS.ORDERS)));
  }, []);

  const [tab, setTab] = useState("READY"); // READY | ACTIVE | HISTORY

  const [driverName, setDriverName] = useState(() => getDriverSession()?.name || "Delivery Partner");
  const driver = useMemo(() => setDriverSession({ name: driverName }), [driverName]);

  const deliveryOrders = useMemo(() => orders.filter(isDelivery), [orders]);

  const readyForPickup = useMemo(() => {
    return deliveryOrders.filter((o) => normalizeStatus(o.status) === "READY_FOR_PICKUP");
  }, [deliveryOrders]);

  const active = useMemo(() => {
    return (
      deliveryOrders.find(
        (o) => normalizeStatus(o.status) === "OUT_FOR_DELIVERY" && o?.driver?.id === driver.id
      ) || null
    );
  }, [deliveryOrders, driver.id]);

  const history = useMemo(() => {
    return deliveryOrders.filter((o) => ["DELIVERED"].includes(normalizeStatus(o.status)));
  }, [deliveryOrders]);

  const geoWatchRef = useRef(null);
  const [lastPos, setLastPos] = useState(null);
  const [deliveredPhoto, setDeliveredPhoto] = useState(null);

  useEffect(() => {
    if (!active?.id) return;
    if (!navigator.geolocation) return;

    geoWatchRef.current = navigator.geolocation.watchPosition(
      (p) => {
        const latLng = { lat: p.coords.latitude, lng: p.coords.longitude };
        setLastPos(latLng);
        setDriverLocationOnOrder(active.id, latLng);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => {
      try {
        if (geoWatchRef.current) navigator.geolocation.clearWatch(geoWatchRef.current);
      } catch {}
    };
  }, [active?.id]);

  const customerCoords = active?.delivery?.coords || null;

  const distKm = useMemo(() => {
    if (!customerCoords || !lastPos) return null;
    return haversineKm(lastPos, customerCoords);
  }, [customerCoords, lastPos]);

  // ✅ Option B: show driver → customer distance on driver panel (computed)
  const distToCustomerKm = useMemo(() => {
    if (!active?.delivery?.coords || !lastPos) return null;
    return haversineKm(lastPos, active.delivery.coords);
  }, [active, lastPos]);

  const routeLine = useMemo(() => {
    if (!customerCoords || !lastPos) return [];
    return [
      [lastPos.lat, lastPos.lng],
      [customerCoords.lat, customerCoords.lng],
    ];
  }, [customerCoords, lastPos]);

  const openGoogleMapsNav = (addr) => {
    const q = encodeURIComponent(addr || "");
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${q}`, "_blank");
  };

  const Header = (
    <header className="cx-topbar cx-topbar-lux">
      <div>
        <div className="cx-title">Delivery Partner</div>
        <div className="cx-subtitle">Restaurant-ready delivery operations dashboard</div>
      </div>
      <div className="cx-topbar-actions">
        <input
          className="cx-input"
          style={{ width: 220 }}
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
          placeholder="Driver name"
        />
        <Link className="cx-btn" to="/home?mode=delivery">
          Customer view
        </Link>
      </div>
    </header>
  );

  return (
    <div className="cx-page">
      <div className="cx-shell">
        {Header}

        <div className="cx-grid" style={{ gridTemplateColumns: "360px 1fr" }}>
          {/* Left panel */}
          <aside className="cx-card">
            <div className="cx-card-head">
              <h2>Queue</h2>
              <div className="cx-mode">
                <button
                  className={`cx-tab ${tab === "READY" ? "active" : ""}`}
                  onClick={() => setTab("READY")}
                  type="button"
                >
                  Ready
                </button>
                <button
                  className={`cx-tab ${tab === "ACTIVE" ? "active" : ""}`}
                  onClick={() => setTab("ACTIVE")}
                  type="button"
                >
                  Active
                </button>
                <button
                  className={`cx-tab ${tab === "HISTORY" ? "active" : ""}`}
                  onClick={() => setTab("HISTORY")}
                  type="button"
                >
                  History
                </button>
              </div>
            </div>

            {tab === "READY" ? (
              readyForPickup.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {readyForPickup.map((o) => (
                    <div key={o.id} className="cx-cart-row">
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 950 }}>#{o.id.slice(-6)} • READY</div>
                        <span className="cx-pill">Pickup</span>
                      </div>
                      <div className="cx-muted">{o.delivery?.address || "Address"}</div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                        <button
                          className="cx-btn cx-btn-soft"
                          type="button"
                          onClick={() => {
                            assignDriverToOrder(o.id, driver);
                            markPickedUp(o.id);
                            setTab("ACTIVE");
                          }}
                        >
                          Picked up
                        </button>

                        <button className="cx-btn" type="button" onClick={() => openGoogleMapsNav(o.delivery?.address)}>
                          Navigate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cx-empty">No orders ready for pickup.</div>
              )
            ) : null}

            {tab === "ACTIVE" ? (
              active ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {/* ✅ A) ACTIVE delivery visually dominant */}
                  <div className="cx-cart-row cx-active-delivery">
                    <div style={{ fontWeight: 950 }}>Active: #{active.id.slice(-6)}</div>

                    {/* ✅ B) Delivery progress timeline */}
                    <div className="cx-timeline">
                      <span className="done">Ready</span>
                      <span className="done">Picked up</span>
                      <span className="active">En route</span>
                      <span>Delivered</span>
                    </div>

                    <div className="cx-muted">{active.delivery?.address}</div>

                    <div className="cx-muted">
                      Driver ping:{" "}
                      {active?.driver?.lastPingISO ? new Date(active.driver.lastPingISO).toLocaleTimeString() : "—"}
                    </div>

                    <div className="cx-muted">
                      Distance: {distKm != null ? `${distKm.toFixed(2)} km` : "—"}
                    </div>

                    {/* ✅ Option B display */}
                    <div className="cx-muted" style={{ marginTop: 10 }}>
                      {distToCustomerKm != null
                        ? `Distance to customer: ${distToCustomerKm.toFixed(2)} km`
                        : "Distance: —"}
                    </div>

                    {/* ✅ C) Distance-based “nearby” feedback */}
                    {distKm != null && distKm < 0.25 && <div className="cx-nearby">You are near the destination</div>}

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                      <button className="cx-btn" type="button" onClick={() => openGoogleMapsNav(active.delivery?.address)}>
                        Navigate
                      </button>
                    </div>
                  </div>

                  <div className="cx-cart-row">
                    <div className="cx-muted" style={{ fontWeight: 900, marginBottom: 6 }}>
                      Delivered photo (required)
                    </div>
                    <input
                      className="cx-input"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const d = await fileToDataUrl(f);
                        setDeliveredPhoto(d);
                      }}
                    />
                    {deliveredPhoto ? (
                      <img
                        alt="Delivered"
                        src={deliveredPhoto}
                        style={{
                          marginTop: 10,
                          width: "100%",
                          borderRadius: 14,
                          border: "1px solid rgba(255,255,255,0.14)",
                        }}
                      />
                    ) : null}

                    <button
                      className="cx-btn cx-btn-primary cx-tap"
                      type="button"
                      disabled={!deliveredPhoto}
                      onClick={() => {
                        // ✅ D) Delivered confirmation (emotional UX)
                        markOrderDelivered(active.id, deliveredPhoto);
                        setDeliveredPhoto(null);
                        alert("Delivery confirmed. Thank you!");
                      }}
                      style={{ marginTop: 10 }}
                    >
                      Mark delivered
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cx-empty">No active delivery assigned to you.</div>
              )
            ) : null}

            {tab === "HISTORY" ? (
              history.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {history.map((o) => (
                    // ✅ E) Improve History cards
                    <div key={o.id} className="cx-cart-row cx-history">
                      <div style={{ fontWeight: 950 }}>#{o.id.slice(-6)} • DELIVERED</div>
                      <div className="cx-muted">{o.delivery?.address}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="cx-empty">No delivered history yet.</div>
              )
            ) : null}
          </aside>

          {/* Right panel */}
          <section className="cx-card">
            <div className="cx-card-head">
              <h2>Live map</h2>

              {/* ✅ F) Improve map UX */}
              <div className="cx-muted">
                {active ? "Live tracking • customer notified" : "Accept an order to start navigation"}
              </div>
            </div>

            {!active ? (
              <div className="cx-empty">No active delivery → map hidden.</div>
            ) : (
              <div className="cx-map" style={{ height: 440 }}>
                <MapContainer center={[storeCoords.lat, storeCoords.lng]} zoom={13} style={{ height: "100%", width: "100%" }}>
                  <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                  <Marker position={[storeCoords.lat, storeCoords.lng]}>
                    <Popup>Store</Popup>
                  </Marker>

                  {customerCoords ? (
                    <Marker position={[customerCoords.lat, customerCoords.lng]}>
                      <Popup>Customer</Popup>
                    </Marker>
                  ) : null}

                  {lastPos ? (
                    <Marker position={[lastPos.lat, lastPos.lng]}>
                      <Popup>You</Popup>
                    </Marker>
                  ) : null}

                  {routeLine.length ? <Polyline positions={routeLine} /> : null}
                </MapContainer>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
