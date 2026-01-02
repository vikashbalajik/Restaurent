// src/utils/ssStore.js

export const SS_KEYS = {
  // ✅ employees
  EMP_PROFILE: "emp_profile",
  EMP_TOKEN: "emp_token",
  EMPLOYEES: "ss_employees",

  // ✅ requests
  TIMESHEET_REQUESTS: "ss_timesheet_requests",
  LEAVE_REQUESTS: "ss_leave_requests",

  // ✅ shifts / announcements
  SHIFTS: "ss_shifts",
  ANNOUNCEMENTS: "ss_announcements",

  // legacy / keep if any old pages still use it
  OWNER_ANNOUNCEMENTS: "ss_owner_announcements",

  // menu (used by owner menu + home fallback)
  OWNER_MENU: "ss_owner_menu",

  // ✅ store profile + reviews (customer pages)
  STORE_PROFILE: "ss_store_profile",
  STORE_REVIEWS: "ss_store_reviews",

  // ✅ dine-in sessions + reservations
  DINEIN_SESSIONS: "ss_dinein_sessions",
  RESERVATIONS: "ss_reservations",

  // receipts
  RECEIPTS: "ss_receipts",

  // ✅ orders + customer session
  ORDERS: "ss_orders",
  CUSTOMER_SESSION: "ss_customer_session",

  // ✅ carts per table (used by your new home)
  CARTS_BY_TABLE: "ss_carts_by_table",

  // ✅ customer auth
  CUSTOMER_USER: "ss_customer_user",
  CUSTOMER_USERS: "ss_customer_users",
  DRIVER_SESSION: "ss_driver_session",
  ORDER_ISSUES: "ss_order_issues",
  // ADD inside SS_KEYS (do not remove existing keys)
OWNER_CHAT: "ss_owner_chat_messages",
// Employee status overrides (soft deactivate)
EMP_STATUS: "ss_employee_status", // map: { [employeeId]: { status, updatedAt } }

// Owner chat (already present in your file, keep it)
OWNER_CHAT: "ss_owner_chat_messages",
WEEKLY_TIMESHEETS: "ss_weekly_timesheets",


  
};


// ✅ Backwards compatibility: some pages import SS_KEYS_EXT
export const SS_KEYS_EXT = { ...SS_KEYS };

export const lsRead = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export const lsWrite = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));

  // ✅ Same-tab live sync
  try {
    window.dispatchEvent(new CustomEvent("ss:changed", { detail: { key } }));
  } catch {}

  // ✅ Backwards compat (older pages)
  try {
    window.dispatchEvent(new CustomEvent("ss_store_write", { detail: { key } }));
  } catch {}
};
export const lsReadArray = (key) => {
  const v = lsRead(key, []);

  // already an array ✅
  if (Array.isArray(v)) return v;

  // sometimes stored as JSON string by mistake ✅
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // sometimes stored as { items: [...] } ✅
  if (v && typeof v === "object" && Array.isArray(v.items)) return v.items;

  return [];
};


export const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

// ✅ day order helper
export const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ✅ profile getter
export const getEmpProfile = () => lsRead(SS_KEYS.EMP_PROFILE, null);

/**
 * ✅ subscribeKey(key, cb)
 * Works for:
 * - same tab (ss:changed OR ss_store_write)
 * - other tabs (native storage)
 */
export const subscribeKey = (key, cb) => {
  const onCustom = (e) => {
    if (e?.detail?.key === key) cb?.();
  };
  const onCustomLegacy = (e) => {
    if (e?.detail?.key === key) cb?.();
  };
  const onStorage = (e) => {
    if (e.key === key) cb?.();
  };

  window.addEventListener("ss:changed", onCustom);
  window.addEventListener("ss_store_write", onCustomLegacy);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("ss:changed", onCustom);
    window.removeEventListener("ss_store_write", onCustomLegacy);
    window.removeEventListener("storage", onStorage);
  };
};

// ✅ announcement creator helper
export const createAnnouncement = ({ title, message, audience }) => {
  const list = lsReadArray(SS_KEYS.ANNOUNCEMENTS);
  const next = [
    {
      id: uid(),
      title,
      message,
      audience,
      createdAt: new Date().toISOString(),
      readBy: [],
    },
    ...list,
  ];
  lsWrite(SS_KEYS.ANNOUNCEMENTS, next);
};

export const yyyyMmDd = (d) => {
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const startOfWeekMon = (dateStr) => {
  const d = new Date(dateStr);
  const day = d.getDay(); // 0 Sun, 1 Mon...
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  return yyyyMmDd(d);
};

export const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

export const yearKey = (dateStr) => {
  const d = new Date(dateStr);
  return String(d.getFullYear());
};

export const dateToDayShort = (dateStr) => {
  const d = new Date(dateStr);
  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map[d.getDay()];
};

export const dayShortToIndex = (day) => {
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[day] ?? 1;
};

export const dateFromWeekStart = (weekStartMon, dayShort) => {
  const base = new Date(`${weekStartMon}T00:00:00`);
  const idx = dayShortToIndex(dayShort); // Mon=1 ... Sun=0
  const offset = idx === 0 ? 6 : idx - 1; // Monday-based offset
  base.setDate(base.getDate() + offset);
  return yyyyMmDd(base);
};

export const countLeaveDaysInclusive = (from, to) => {
  const a = new Date(from);
  const b = new Date(to);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  if (b < a) return 0;
  const diff = Math.round((b - a) / (1000 * 60 * 60 * 24));
  return diff + 1;
};

export const getAcceptedLeaveDaysInMonth = (employeeId, anyDateInMonth) => {
  const m = monthKey(anyDateInMonth);
  const rows = lsReadArray(SS_KEYS.LEAVE_REQUESTS);
  return rows
    .filter((r) => r.employeeId === employeeId && r.status === "Accepted")
    .reduce((sum, r) => {
      const fromM = monthKey(r.from);
      const toM = monthKey(r.to);
      if (m < fromM || m > toM) return sum;

      const from = new Date(r.from);
      const to = new Date(r.to);
      const monthStart = new Date(`${m}-01T00:00:00`);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(monthEnd.getDate() - 1);

      const start = from < monthStart ? monthStart : from;
      const end = to > monthEnd ? monthEnd : to;

      return sum + countLeaveDaysInclusive(yyyyMmDd(start), yyyyMmDd(end));
    }, 0);
};

export const getLeaveBalance = (employeeId, anyDateInMonth, allowedPerMonth = 3) => {
  const used = getAcceptedLeaveDaysInMonth(employeeId, anyDateInMonth);
  return { allowed: allowedPerMonth, used, remaining: Math.max(0, allowedPerMonth - used) };
};

export const getApprovedTimesheets = () => {
  const rows = lsReadArray(SS_KEYS.TIMESHEET_REQUESTS);
  return rows.filter((t) => t.status === "Accepted");
};

export const calcWeekHours = (employeeId, weekStartMon) => {
  const approved = getApprovedTimesheets();
  return approved
    .filter((t) => t.employeeId === employeeId && startOfWeekMon(t.date) === weekStartMon)
    .reduce((sum, t) => sum + Number(t.hours || 0), 0);
};

export const calcMonthOvertime = (employeeId, month) => {
  const approved = getApprovedTimesheets().filter((t) => t.employeeId === employeeId);
  const weeks = {};
  for (const t of approved) {
    if (monthKey(t.date) !== month) continue;
    const w = startOfWeekMon(t.date);
    weeks[w] = (weeks[w] || 0) + Number(t.hours || 0);
  }
  return Object.values(weeks).reduce((sum, wh) => sum + Math.max(0, wh - 40), 0);
};

export const calcYearOvertime = (employeeId, year) => {
  const approved = getApprovedTimesheets().filter((t) => t.employeeId === employeeId);
  const weeks = {};
  for (const t of approved) {
    if (yearKey(t.date) !== year) continue;
    const w = startOfWeekMon(t.date);
    weeks[w] = (weeks[w] || 0) + Number(t.hours || 0);
  }
  return Object.values(weeks).reduce((sum, wh) => sum + Math.max(0, wh - 40), 0);
};

export const computeEntryHours = (entry) => {
  if (!entry) return 0;
  const dayType = String(entry.dayType || entry.type || "Work");
  if (dayType !== "Work") return 0;

  const start = String(entry.start || entry.inTime || "").trim();
  const end = String(entry.end || entry.outTime || "").trim();
  if (!start || !end) return 0;

  const [sh, sm] = start.split(":").map((n) => parseInt(n, 10));
  const [eh, em] = end.split(":").map((n) => parseInt(n, 10));
  if ([sh, sm, eh, em].some((x) => Number.isNaN(x))) return 0;

  const breakMins = Math.max(0, Number(entry.breakMins || 0));

  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  const diffMin = Math.max(0, endMin - startMin - breakMins);

  return Number((diffMin / 60).toFixed(2));
};


export const computeWeeklyTotals = (entries) => {
  const list = Array.isArray(entries) ? entries : [];

  const totalHours = list.reduce((sum, e) => sum + Number(computeEntryHours(e) || 0), 0);
  const total = Number(totalHours.toFixed(2));

  const regular = Number(Math.min(40, total).toFixed(2));
  const overtime = Number(Math.max(0, total - 40).toFixed(2));

  const counts = list.reduce((acc, e) => {
    const t = String(e.dayType || e.type || "Work");
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  // ✅ backwards compatible + new fields
  return { total, regular, overtime, totalHours: total, counts };
};


export const toDateInput = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

export const fmtDate = (d) => {
  if (!d) return "";
  const x = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(x.getTime())) return "";
  return x.toLocaleDateString();
};

// ✅ optional helpers you asked earlier
export const getOrCreateCustomerSession = () => {
  const existing = lsRead(SS_KEYS.CUSTOMER_SESSION, "");
  if (existing) return existing;
  const id = uid();
  lsWrite(SS_KEYS.CUSTOMER_SESSION, id);
  return id;
};

export const lsUpsertArrayItem = (key, item, getId = (x) => x.id) => {
  const arr = lsReadArray(key);
  const id = getId(item);
  const idx = arr.findIndex((x) => getId(x) === id);
  const next = idx === -1 ? [item, ...arr] : arr.map((x) => (getId(x) === id ? item : x));
  lsWrite(key, next);
  return next;
};

export const money = (n) => {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { style: "currency", currency: "INR" });
};

export const minutesToMs = (m) => Math.max(0, Number(m || 0)) * 60 * 1000;

/* =========================================================
   ✅ Kitchen / Host Orders helpers (so imports stop failing)
   ========================================================= */

// Kitchen pages expect this enum:
export const ORDER_STATUS = {
  PLACED: "PLACED",
  ACCEPTED: "ACCEPTED",
  COOKING: "COOKING",
  READY: "READY",
  SERVED: "SERVED",
  CANCELLED: "CANCELLED",
};

// Read all orders (safe array)
export const readOrders = () => lsReadArray(SS_KEYS.ORDERS);

// ✅ Write all orders (keeps same-tab sync) + de-dupe by id
export const writeOrders = (orders) => {
  const arr = Array.isArray(orders) ? orders : [];

  // ✅ de-dupe by id (prevents duplicate orders in history)
  const seen = new Set();
  const next = arr.filter((o) => {
    const id = o?.id;
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  lsWrite(SS_KEYS.ORDERS, next);
  return next;
};

// Patch one order by id (merge patch)
export const patchOrder = (orderId, patch = {}) => {
  const list = readOrders();
  const next = list.map((o) => (o?.id === orderId ? { ...o, ...patch } : o));
  writeOrders(next);
  return next.find((o) => o?.id === orderId) || null;
};

// Add a kitchen/customer message to an order
export const addOrderMessage = (orderId, message) => {
  const text = typeof message === "string" ? message.trim() : (message?.text || "").trim();
  if (!text) return null;

  const msgObj =
    typeof message === "string"
      ? { id: uid(), from: "Kitchen", text, at: new Date().toISOString() }
      : {
          id: message?.id || uid(),
          from: message?.from || "Kitchen",
          text,
          at: message?.at || new Date().toISOString(),
        };

  const list = readOrders();
  const next = list.map((o) =>
    o?.id === orderId ? { ...o, liveNotes: [...(o.liveNotes || []), msgObj] } : o
  );

  writeOrders(next);
  return msgObj;
};

// Set ETA in minutes (stores when ETA was set)
export const setOrderETA = (orderId, minutes) => {
  const m = Math.max(0, Number(minutes || 0));
  return patchOrder(orderId, {
    eta: m ? { minutes: m, setAtISO: new Date().toISOString() } : null,
  });
};

// Remaining milliseconds for countdown based on order.eta
export const remainingMs = (order) => {
  const eta = order?.eta;
  if (!eta?.minutes || !eta?.setAtISO) return 0;
  const setAt = new Date(eta.setAtISO).getTime();
  if (Number.isNaN(setAt)) return 0;
  const end = setAt + minutesToMs(eta.minutes);
  return Math.max(0, end - Date.now());
};

// Format milliseconds as mm:ss
export const formatCountdown = (ms) => {
  const totalSec = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

// Subtotal for an order items list
export const calcOrderSubtotal = (order) => {
  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((sum, it) => {
    const price = Number(it?.price || 0);
    const qty = Number(it?.qty || 1);
    return sum + price * qty;
  }, 0);
};

// KitchenOrders imports formatMoney; you already have money()
export const formatMoney = (n) => money(n);

// ---------------------------------------------------------------------------
// Customer store (UberEats-like) helpers
// ---------------------------------------------------------------------------

// We intentionally keep these keys local to avoid breaking older pages that
// rely on the existing SS_KEYS shape.
const STORE_PROFILE_KEY = "ss_store_profile";
const STORE_REVIEWS_KEY = "ss_store_reviews";

/**
 * readStoreProfile()
 * Returns basic store info used by customer-facing pages.
 */
export const readStoreProfile = () =>
  lsRead(STORE_PROFILE_KEY, {
    name: "Smokey's Cave",
    address: "1361 Creekside Dr #2006, Norman, OK 73071",
    taxRate: 0.0875,
    deliveryRadiusKm: 15,
    currency: "USD",
    fallbackLatLng: { lat: 35.2226, lng: -97.4395 }, // Norman, OK
  });

/**
 * readStoreReviews()
 * Returns an array of reviews.
 */
export const readStoreReviews = () => {
  const rows = lsRead(STORE_REVIEWS_KEY, []);
  return Array.isArray(rows) ? rows : [];
};

/**
 * readCustomerOrders(customerId)
 * Returns a user's past orders. (Used for "Past orders" section.)
 */
export const readCustomerOrders = (customerId) => {
  if (!customerId) return [];
  return readOrders()
    .filter((o) => o?.customerId === customerId)
    .sort((a, b) => (a?.createdAt < b?.createdAt ? 1 : -1));
};

/**
 * addCustomerOrder(order)
 * Persists an order into SS_KEYS.ORDERS so Kitchen/Host can see it too.
 */
export const addCustomerOrder = (order) => {
  const clean = {
    ...order,
    id: order?.id || uid(),
    createdAt: order?.createdAt || new Date().toISOString(),
  };
  const list = readOrders();
  writeOrders([clean, ...list]);
  return clean;
};

// ✅ DEFAULT STORE PROFILE (merged in seed to migrate old profiles)
const DEFAULT_STORE_PROFILE = {
  name: "SS Authentic Cuisine",
  addressLine: "1361 Creekside Dr #2006, Norman, OK 73071",
  taxRate: 0.0875,

  // ✅ IMPORTANT: store coordinates (example for Norman, OK area)
  latLng: { lat: 35.2226, lng: -97.4395 },

  // ✅ fallback if latLng missing (older saved profiles)
  fallbackLatLng: { lat: 35.2226, lng: -97.4395 },

  deliveryRadiusKm: 15,
};

/**
 * seedStoreIfMissing()
 * Seeds profile + reviews + (optional) demo menu if not present.
 */
export const seedStoreIfMissing = () => {
  // Store profile
  const existing = lsRead(SS_KEYS.STORE_PROFILE, null);

  // ✅ Merge defaults into existing (migrates old profiles)
  const merged = {
    ...DEFAULT_STORE_PROFILE,
    ...(existing && typeof existing === "object" ? existing : {}),
  };

  // ✅ Ensure both fields exist even if old data overwrote them
  if (!merged.latLng && merged.fallbackLatLng) merged.latLng = merged.fallbackLatLng;
  if (!merged.fallbackLatLng && merged.latLng) merged.fallbackLatLng = merged.latLng;

  lsWrite(SS_KEYS.STORE_PROFILE, merged);

  // Reviews (keep existing logic)
  const existingReviews = lsRead(STORE_REVIEWS_KEY, null);
  if (!existingReviews) {
    const seed = [
      { id: uid(), name: "bryce C.", stars: 5, date: "11/29/25", text: "So fast Ty ily my driver" },
      { id: uid(), name: "Margaret B.", stars: 5, date: "10/13/25", text: "SOOOO good perfectly satisfied my craving." },
      {
        id: uid(),
        name: "Gabriel B.",
        stars: 5,
        date: "08/22/25",
        text: "Dude delivered in record time would recommend guys the goat",
      },
      { id: uid(), name: "Anson H.", stars: 4, date: "07/13/25", text: "Very quick." },
      { id: uid(), name: "Nathen G.", stars: 5, date: "06/30/25", text: "Very professional and very nice" },
      {
        id: uid(),
        name: "Ian P.",
        stars: 5,
        date: "05/09/25",
        text: "That guy is awesome. Professional, On Time, and Polite.",
      },
    ];
    lsWrite(STORE_REVIEWS_KEY, seed);
  }

  // Menu (only if empty) (keep existing logic)
  const menu = lsReadArray(SS_KEYS.OWNER_MENU);
  if (!menu.length) {
    const demoMenu = [
      // Appetizers
      { id: uid(), name: "Mozzarella Sticks", price: 5.99, category: "Appetizers", imageUrl: "" },
      { id: uid(), name: "Loaded Nachos", price: 7.49, category: "Appetizers", imageUrl: "" },
      // Main Course
      { id: uid(), name: "Chicken Alfredo", price: 12.99, category: "Main Course", imageUrl: "" },
      { id: uid(), name: "Classic Cheeseburger", price: 10.99, category: "Main Course", imageUrl: "" },
      // Desserts
      { id: uid(), name: "Chocolate Lava Cake", price: 6.49, category: "Desserts", imageUrl: "" },
      { id: uid(), name: "Cheesecake", price: 5.99, category: "Desserts", imageUrl: "" },
      // Drinks
      { id: uid(), name: "Iced Tea", price: 2.49, category: "Drinks", imageUrl: "" },
      { id: uid(), name: "Soda", price: 2.29, category: "Drinks", imageUrl: "" },
    ];
    lsWrite(SS_KEYS.OWNER_MENU, demoMenu);
  }
};

/* =========================================================
   ✅ Customer auth helpers (so Checkout/Login/Home imports stop failing)
   ========================================================= */

export const getCustomerUser = () => {
  const u = lsRead(SS_KEYS.CUSTOMER_USER, null);
  if (!u || typeof u !== "object") return null;

  // ✅ migrate legacy users that were saved without id
  if (!u.id) {
    return setCustomerUser(u);
  }
  return u;
};

export const setCustomerUser = (user) => {
  if (!user) {
    lsWrite(SS_KEYS.CUSTOMER_USER, null);
    return null;
  }
  const clean = {
    id: user.id || uid(),
    name: user.name || "Customer",
    email: user.email || "",
    phone: user.phone || "",
  };
  lsWrite(SS_KEYS.CUSTOMER_USER, clean);
  return clean;
};

// Very simple local register (DEMO: stores password in localStorage)
// In production: never store plaintext passwords; use backend auth.
export const registerCustomerLocal = ({ name, email, phone, password }) => {
  const users = lsReadArray(SS_KEYS.CUSTOMER_USERS);

  const e = String(email || "").trim().toLowerCase();
  const p = String(phone || "").trim();

  if (!e && !p) return { ok: false, error: "Email or phone is required." };
  if (!password || String(password).length < 4) return { ok: false, error: "Password is too short." };

  const exists = users.some(
    (u) => (e && String(u.email || "").toLowerCase() === e) || (p && String(u.phone || "") === p)
  );
  if (exists) return { ok: false, error: "Account already exists. Please log in." };

  const user = {
    id: uid(),
    name: String(name || "Customer").trim(),
    email: e,
    phone: p,
    password: String(password), // demo only
    createdAt: new Date().toISOString(),
  };

  lsWrite(SS_KEYS.CUSTOMER_USERS, [user, ...users]);

  // auto-login after register
  setCustomerUser(user);

  return { ok: true, user: getCustomerUser() };
};

export const loginCustomerLocal = ({ emailOrPhone, password }) => {
  const users = lsReadArray(SS_KEYS.CUSTOMER_USERS);

  const id = String(emailOrPhone || "").trim().toLowerCase();
  const pw = String(password || "");

  if (!id || !pw) return { ok: false, error: "Enter email/phone and password." };

  const found = users.find((u) => {
    const e = String(u.email || "").toLowerCase();
    const p = String(u.phone || "");
    return e === id || p === id;
  });

  if (!found) return { ok: false, error: "Account not found." };
  if (String(found.password || "") !== pw) return { ok: false, error: "Invalid password." };

  setCustomerUser(found);
  return { ok: true, user: getCustomerUser() };
};

export const logoutCustomer = () => {
  lsWrite(SS_KEYS.CUSTOMER_USER, null);
  return true;
};

// --- Dine-in session (one open bill per table) ---
export const getOrCreateDineInSession = (table) => {
  const t = Number(table || 1);
  const list = lsReadArray(SS_KEYS.DINEIN_SESSIONS);
  const existing = list.find((s) => s.table === t && s.status === "OPEN");
  if (existing) return existing;

  const next = { id: uid(), table: t, status: "OPEN", openedAt: new Date().toISOString() };
  lsWrite(SS_KEYS.DINEIN_SESSIONS, [next, ...list]);
  return next;
};

export const closeDineInSession = (sessionId) => {
  const list = lsReadArray(SS_KEYS.DINEIN_SESSIONS);
  const next = list.map((s) =>
    s.id === sessionId ? { ...s, status: "CLOSED", closedAt: new Date().toISOString() } : s
  );
  lsWrite(SS_KEYS.DINEIN_SESSIONS, next);
  return next.find((s) => s.id === sessionId) || null;
};

// --- Reservations ---
export const readReservations = () => lsReadArray(SS_KEYS.RESERVATIONS);

export const isTableReserved = (table, startISO, endISO) => {
  const t = Number(table || 1);
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;

  return readReservations().some((r) => {
    if (Number(r.table) !== t) return false;
    const rs = new Date(r.startISO).getTime();
    const re = new Date(r.endISO).getTime();
    // overlap check
    return start < re && end > rs;
  });
};

export const addReservation = ({ table, startISO, endISO, name, phone }) => {
  if (isTableReserved(table, startISO, endISO)) {
    return { ok: false, error: "That table is already reserved for that time slot." };
  }
  const row = {
    id: uid(),
    table: Number(table || 1),
    startISO,
    endISO,
    name: String(name || "Guest").trim(),
    phone: String(phone || "").trim(),
    createdAt: new Date().toISOString(),
  };
  const list = readReservations();
  lsWrite(SS_KEYS.RESERVATIONS, [row, ...list]);
  return { ok: true, reservation: row };
};
// ===============================
// ✅ Receipts
// one checkout = one receipt
// ===============================
export const readReceipts = () => lsReadArray(SS_KEYS.RECEIPTS);

export const addReceipt = (receipt) => {
  const list = lsReadArray(SS_KEYS.RECEIPTS);
  lsWrite(SS_KEYS.RECEIPTS, [receipt, ...list]);
  return receipt;
};

export const buildReceiptFromOrder = (order) => {
  const items = (order?.items || []).map((it) => ({
    id: it.id,
    name: it.name,
    price: Number(it.price || 0),
    qty: Number(it.qty || 1),
  }));

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
  const tax = Number(order?.tax || 0);
  const fee = Number(order?.deliveryFee || 0);
  const total = Number(order?.total || subtotal + tax + fee);

  return {
    id: uid(),
    orderId: order.id,
    createdAt: new Date().toISOString(),
    serviceType: order.serviceType,
    table: order.table || null,

    customer: order.customer || null,
    delivery: order.delivery || null,

    items,
    subtotal,
    tax,
    fee,
    total,
  };
};

// ===============================
// ✅ Status normalization for delivery
// ===============================
export const isDelivery = (order) =>
  String(order?.serviceType || "").toUpperCase() === "DELIVERY";

export const normalizeStatus = (status) => String(status || "").toUpperCase();

export const shouldShowCustomerMap = (order) => {
  const st = normalizeStatus(order?.status);
  // show map only when driver is active / out for delivery
  return st === "OUT_FOR_DELIVERY";
};

// ===============================
// ✅ ETA normalization + countdown safe
// ===============================
export const normalizeOrderETA = (order) => {
  const eta = order?.eta;
  if (typeof eta === "number" && eta > 0) {
    return { minutes: eta, setAtISO: order?.createdAt || new Date().toISOString() };
  }
  if (eta?.minutes && eta?.setAtISO) return eta;
  return null;
};

export const remainingMsNormalized = (order) => {
  // stop countdown if delivered
  if (normalizeStatus(order?.status) === "DELIVERED") return 0;

  const eta = normalizeOrderETA(order);
  if (!eta) return 0;
  const setAt = new Date(eta.setAtISO).getTime();
  if (Number.isNaN(setAt)) return 0;
  const end = setAt + minutesToMs(eta.minutes);
  return Math.max(0, end - Date.now());
};

// ===============================
// ✅ Driver session
// ===============================
export const getDriverSession = () => lsRead(SS_KEYS.DRIVER_SESSION, null);
export const setDriverSession = (driver) => {
  const d = { id: driver?.id || uid(), name: driver?.name || "Delivery Partner" };
  lsWrite(SS_KEYS.DRIVER_SESSION, d);
  return d;
};

// ===============================
// ✅ Delivery workflow patches
// ===============================
export const assignDriverToOrder = (orderId, driver) => {
  const d = { id: driver?.id || uid(), name: driver?.name || "Delivery Partner" };
  return patchOrder(orderId, {
    driver: {
      id: d.id,
      name: d.name,
      assignedAtISO: new Date().toISOString(),
      lastLatLng: null,
      lastPingISO: null,
      deliveredPhoto: null,
    },
  });
};

export const markPickedUp = (orderId) => {
  // driver picked up order from restaurant
  return patchOrder(orderId, {
    status: "OUT_FOR_DELIVERY",
  });
};

export const setDriverLocationOnOrder = (orderId, latLng) => {
  if (!latLng?.lat || !latLng?.lng) return null;
  const current = readOrders().find((o) => o.id === orderId) || {};
  return patchOrder(orderId, {
    driver: {
      ...(current.driver || {}),
      lastLatLng: { lat: Number(latLng.lat), lng: Number(latLng.lng) },
      lastPingISO: new Date().toISOString(),
    },
  });
};

export const markOrderDelivered = (orderId, deliveredPhotoDataUrl) => {
  // ✅ also clears ETA so customer countdown stops and UI can hide map
  const current = readOrders().find((o) => o.id === orderId) || {};
  return patchOrder(orderId, {
    status: "DELIVERED",
    eta: null,
    driver: {
      ...(current.driver || {}),
      deliveredAtISO: new Date().toISOString(),
      deliveredPhoto: deliveredPhotoDataUrl || null,
    },
  });
};

// ===============================
// ✅ Help / Issues
// ===============================
export const readOrderIssues = () => lsReadArray(SS_KEYS.ORDER_ISSUES);

export const addOrderIssue = ({ orderId, customerId, category, message, photoDataUrl }) => {
  const issue = {
    id: uid(),
    orderId,
    customerId: customerId || null,
    category: category || "Something else",
    message: (message || "").trim(),
    photoDataUrl: photoDataUrl || null,
    createdAt: new Date().toISOString(),
    status: "OPEN",
  };
  const list = lsReadArray(SS_KEYS.ORDER_ISSUES);
  lsWrite(SS_KEYS.ORDER_ISSUES, [issue, ...list]);
  return issue;
};
// ===============================
// ✅ Geo distance (km) for driver "nearby" + distance UI
// ===============================
export const haversineKm = (a, b) => {
  if (!a || !b) return Infinity;

  const toRad = (x) => (Number(x) * Math.PI) / 180;
  const R = 6371; // km

  const dLat = toRad(Number(b.lat) - Number(a.lat));
  const dLng = toRad(Number(b.lng) - Number(a.lng));

  const lat1 = toRad(Number(a.lat));
  const lat2 = toRad(Number(b.lat));

  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(s));
};
// ================================
// Owner: Employees directory helpers
// ================================
export const readEmployees = () => lsReadArray(SS_KEYS.EMPLOYEES);

export const setEmployeeActive = (employeeId, active) => {
  const list = lsReadArray(SS_KEYS.EMPLOYEES);
  const next = list.map((e) =>
    String(e.employeeId || e.id || e._id) === String(employeeId)
      ? { ...e, active: !!active, deactivatedAtISO: active ? null : new Date().toISOString() }
      : e
  );
  lsWrite(SS_KEYS.EMPLOYEES, next);
  return next.find((e) => String(e.employeeId || e.id || e._id) === String(employeeId)) || null;
};

// Ensure any employee object defaults to active if missing (non-breaking)
export const isEmployeeActive = (e) => e?.active !== false;

// ================================
// Owner: Local chat fallback (works without backend)
// ================================
const convoKey = (a, b) => [String(a), String(b)].sort().join("__");

export const readOwnerChat = () => lsRead(SS_KEYS.OWNER_CHAT, {}); // { [convoKey]: [msg...] }

export const writeOwnerChat = (obj) => lsWrite(SS_KEYS.OWNER_CHAT, obj || {});

export const appendOwnerChatMessage = ({ from, to, message }) => {
  const store = readOwnerChat();
  const key = convoKey(from, to);
  const arr = Array.isArray(store[key]) ? store[key] : [];
  const msg = {
    _id: uid(),
    from: String(from),
    to: String(to),
    message: String(message || "").trim(),
    createdAt: new Date().toISOString(),
  };
  store[key] = [...arr, msg];
  writeOwnerChat(store);
  return msg;
};
export const getEmpStatusMap = () => lsRead(SS_KEYS.EMP_STATUS, {});
export const setEmpStatusMap = (next) => lsWrite(SS_KEYS.EMP_STATUS, next);

// Returns "Active" by default
export const getEmployeeStatus = (employeeId) => {
  const map = getEmpStatusMap();
  const rec = map?.[employeeId];
  return rec?.status || "Active";
};

// Soft deactivate (preserves all employee data)
export const setEmployeeStatus = (employeeId, status) => {
  const map = getEmpStatusMap();
  const next = {
    ...map,
    [employeeId]: { status, updatedAt: new Date().toISOString() },
  };
  setEmpStatusMap(next);
  return next;
};
 