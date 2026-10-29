// Password hashing with a transparent upgrade path.
// Older accounts were stored in plain text; they are re-hashed the first time
// the owner signs in successfully, so nobody has to reset their password.
const bcrypt = require("bcryptjs");

const ROUNDS = 10;

const isHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

const hashPassword = (plain) => bcrypt.hash(String(plain), ROUNDS);

/** @returns {Promise<{ ok: boolean, needsUpgrade: boolean }>} */
async function verifyPassword(plain, stored) {
  if (stored == null || plain == null) return { ok: false, needsUpgrade: false };
  if (isHash(stored)) return { ok: await bcrypt.compare(String(plain), stored), needsUpgrade: false };
  // Legacy plain-text value
  const ok = String(plain) === String(stored);
  return { ok, needsUpgrade: ok };
}

module.exports = { isHash, hashPassword, verifyPassword };
