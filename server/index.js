// Salaria Makeovers backend - Express + SQLite
// One state blob (content/services/portfolio/testimonials/stats/tags/bookings/admin fields),
// mirroring the shape the React app already used with sessionStorage, now persisted for real.

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "salaria.db");
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function createDatabase(filePath) {
  try {
    const BetterSqlite3 = require("better-sqlite3");
    return new BetterSqlite3(filePath);
  } catch (e) {
    const { DatabaseSync } = require("node:sqlite");
    const syncDb = new DatabaseSync(filePath);
    return {
      pragma: (str) => syncDb.exec(`PRAGMA ${str}`),
      exec: (sql) => syncDb.exec(sql),
      prepare: (sql) => syncDb.prepare(sql),
    };
  }
}

const db = createDatabase(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, created_at INTEGER NOT NULL);
`);

const DEFAULT_STATE = {
  content: {
    heroSub: "Professional & Certified MUA", heroTitle1: "Creating",
    heroItalic: "Confidence", heroTitle2: "Not Just Contours",
    heroDesc: "Transforming your vision into reality with expert makeup artistry, hairstyling & a touch of magic for every occasion.",
    aboutName: "Mamta Salaria",
    aboutDesc: "A professional & certified makeup artist and hairstylist with a passion for making every client feel their most beautiful and confident. Specializing in bridal, party, and editorial looks - every face tells a unique story, and I'm here to make yours unforgettable.",
    footerTagline: "Professional & Certified Makeup Artist. Creating confidence, not just contours.",
    instagram: "@salaria_makeovers", youtube: "@Salaria_Makeovers",
    phone: "+91 99154 99034", gmail: "salaria.makeovers@gmail.com",
    bookingTitle: "Let's Create Your Dream Look",
    bookingDesc: "Fill in your details below and I'll get back to you within 24 hours.",
    whatsapp: "9915499034",
    upiId: "salaria@upi", upiName: "Salaria Makeovers",
    advancePct: 25,
  },
  services: [
    { id: 1, title: "Bridal Makeup", desc: "Your dream look for the most special day. HD airbrush, traditional, or contemporary - tailored to your vision.", price: "Starting ₹15,000", icon: "👰", popular: true },
    { id: 2, title: "Party & Event", desc: "Glamorous looks for engagements, receptions, sangeet, cocktail nights & celebrations.", price: "Starting ₹5,000", icon: "✨", popular: false },
    { id: 3, title: "Pre-Wedding Shoot", desc: "Camera-ready makeup that photographs beautifully for your pre-wedding & couple shoots.", price: "Starting ₹8,000", icon: "📸", popular: false },
    { id: 4, title: "Hair Styling", desc: "Elegant updos, braids, floral buns & trendy styles for every occasion and outfit.", price: "Starting ₹3,000", icon: "💇", popular: false },
    { id: 5, title: "Engagement Look", desc: "Soft glam or bold beauty - a custom look that makes you shine at your ring ceremony.", price: "Starting ₹10,000", icon: "💍", popular: true },
    { id: 6, title: "Makeup Classes", desc: "Learn professional techniques - self-makeup workshops & certified MUA training programs.", price: "Starting ₹20,000", icon: "🎓", popular: false },
  ],
  portfolio: [
    { id: 1, category: "Bridal", gradient: "linear-gradient(135deg,#C9A96E,#8B6914)", label: "Bridal Elegance" },
    { id: 2, category: "Party", gradient: "linear-gradient(135deg,#E8D5B0,#C9A96E)", label: "Party Glam" },
    { id: 3, category: "Editorial", gradient: "linear-gradient(135deg,#2C1810,#C9A96E)", label: "Editorial Look" },
    { id: 4, category: "Bridal", gradient: "linear-gradient(135deg,#C9A96E,#F5E6CC)", label: "Royal Bride" },
    { id: 5, category: "Engagement", gradient: "linear-gradient(135deg,#1a1a2e,#C9A96E)", label: "Ring Ceremony" },
    { id: 6, category: "Hair", gradient: "linear-gradient(135deg,#C9A96E,#3D2B1F)", label: "Hair Art" },
  ],
  testimonials: [
    { id: 1, name: "Priya Sharma", event: "Bridal Makeup", text: "Absolutely stunning work! She understood exactly what I wanted and made me feel like a queen on my wedding day. Every guest complimented my look!", rating: 5 },
    { id: 2, name: "Neha Gupta", event: "Engagement Party", text: "The makeup lasted the entire event - through dancing, tears of joy, everything! Professional, punctual, and incredibly talented.", rating: 5 },
    { id: 3, name: "Anita Verma", event: "Pre-Wedding Shoot", text: "My photos turned out absolutely gorgeous. She knew exactly what works on camera and created a look that was both natural and glamorous.", rating: 5 },
  ],
  stats: [
    { id: 1, number: "270+", label: "Looks Created" }, { id: 2, number: "200+", label: "Happy Brides" },
    { id: 3, number: "5+", label: "Years Experience" }, { id: 4, number: "1000+", label: "Happy Clients" },
  ],
  tags: ["Certified MUA", "HD Airbrush Expert", "Freelance Artist", "Bridal Specialist"],
  bookings: [],
  adminPwd: "salaria2026",
  adminPhone: "9915499034",
  failedAttempts: 0,
  lockUntil: null,
};

function loadState() {
  const row = db.prepare("SELECT data FROM state WHERE id = 1").get();
  if (!row) {
    db.prepare("INSERT INTO state (id, data) VALUES (1, ?)").run(JSON.stringify(DEFAULT_STATE));
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
  return JSON.parse(row.data);
}
function saveState(state) {
  db.prepare("UPDATE state SET data = ? WHERE id = 1").run(JSON.stringify(state));
}

// Seed row if missing
loadState();

function publicView(state) {
  const { content, services, portfolio, testimonials, stats, tags, adminPhone } = state;
  // adminPhone doubles as the public WhatsApp contact number shown on the site already,
  // so exposing it here is not a new disclosure.
  return { content, services, portfolio, testimonials, stats, tags, adminPhone };
}

function makeToken() {
  return crypto.randomBytes(24).toString("hex");
}
function cleanupSessions() {
  db.prepare("DELETE FROM sessions WHERE created_at < ?").run(Date.now() - SESSION_TTL_MS);
}
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  cleanupSessions();
  const row = db.prepare("SELECT token FROM sessions WHERE token = ?").get(token);
  if (!row) return res.status(401).json({ error: "Invalid or expired session" });
  next();
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Public: site content for the main website (no bookings, no password).
app.get("/api/site", (req, res) => {
  res.json(publicView(loadState()));
});

// Public: visitor submits a booking from the site's booking form.
app.post("/api/bookings", (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.phone) return res.status(400).json({ error: "name and phone are required" });
  const state = loadState();
  const booking = {
    id: Date.now(),
    name: b.name, phone: b.phone, email: b.email || "",
    date: b.date || "", service: b.service || "", location: b.location || "",
    servicePrice: b.servicePrice || "", advanceAmt: b.advanceAmt || "",
    inspiration: b.inspiration || "", message: b.message || "",
    submittedAt: new Date().toISOString(),
    status: "new",
    paymentStatus: b.paymentStatus || "pending",
  };
  state.bookings = [booking, ...state.bookings];
  saveState(state);
  res.status(201).json(booking);
});

// Admin login. Lockout counters live in the same state blob the app already used.
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  const state = loadState();
  const now = Date.now();
  if (state.lockUntil && now < state.lockUntil) {
    return res.status(423).json({ error: "Locked", failedAttempts: state.failedAttempts, lockUntil: state.lockUntil });
  }
  if (password === state.adminPwd) {
    state.failedAttempts = 0;
    state.lockUntil = null;
    saveState(state);
    cleanupSessions();
    const token = makeToken();
    db.prepare("INSERT INTO sessions (token, created_at) VALUES (?, ?)").run(token, now);
    return res.json({ token });
  }
  state.failedAttempts = (state.failedAttempts || 0) + 1;
  state.lockUntil = state.failedAttempts >= 5 ? now + 10 * 60 * 1000 : null;
  saveState(state);
  res.status(401).json({ error: "Incorrect password", failedAttempts: state.failedAttempts, lockUntil: state.lockUntil });
});

// "Forgot password" flow (matches the app's existing OTP-reset UI, which is a client-side
// demo and was never backed by a real WhatsApp OTP service). Kept at the same trust level.
app.post("/api/admin/change-password", (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });
  const state = loadState();
  state.adminPwd = newPassword;
  saveState(state);
  res.json({ ok: true });
});

// Admin: full state (content + bookings + security fields) for the dashboard.
app.get("/api/admin/state", requireAuth, (req, res) => {
  res.json(loadState());
});

// Admin: replace the whole state blob. Every AdminDashboard edit (content, services,
// booking status/delete, password change) goes through this single endpoint, exactly
// mirroring the single setState() call the React app already used.
app.put("/api/admin/state", requireAuth, (req, res) => {
  const next = req.body;
  if (!next || typeof next !== "object") return res.status(400).json({ error: "Invalid state" });
  saveState(next);
  res.json({ ok: true });
});

// Serve the built React app from the same server/origin in production, so the
// frontend's relative "/api/..." fetches work with no separate proxy or
// hardcoded backend URL. (In dev, CRA's own dev server + "proxy" field in
// package.json handles this instead; this static serve is a no-op then
// since build/ won't exist yet.)
const buildDir = path.join(__dirname, "..", "build");
if (require("fs").existsSync(buildDir)) {
  app.use(express.static(buildDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(buildDir, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Salaria Makeovers backend running on http://localhost:${PORT}`);
});
