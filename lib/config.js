// Central configuration. All secrets come from .env — never hard-code them.
require("dotenv").config();
const crypto = require("crypto");

function requiredSecret(name, fallback) {
  const value = process.env[name] || fallback;
  if (value) return value;
  console.warn(
    `⚠️  ${name} is not set in .env. Using a temporary random value — everyone will be signed out when the server restarts.`,
  );
  return crypto.randomBytes(48).toString("hex");
}

const JWT_SECRET = requiredSecret("JWT_SECRET");

module.exports = {
  PORT: Number(process.env.PORT) || 5500,
  IS_PROD: process.env.NODE_ENV === "production",
  JWT_SECRET,
  // Falls back to a value derived from JWT_SECRET so existing deployments keep working.
  SESSION_SECRET:
    process.env.SESSION_SECRET ||
    crypto.createHash("sha256").update(`session:${JWT_SECRET}`).digest("hex"),
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ||
    "https://oyinakokocda.org,https://www.oyinakokocda.org,http://localhost:5500,http://127.0.0.1:5500")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
