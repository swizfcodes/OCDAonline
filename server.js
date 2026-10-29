const path = require("path");
const express = require("express");
const session = require("express-session");
const cors = require("cors");

const config = require("./lib/config");
const { request } = require("./db-wrapper");
const { hashPassword, verifyPassword } = require("./lib/passwords");
const { rateLimit } = require("./lib/rateLimit");
const adminRoutes = require("./routes/admin");

const app = express();
const PUBLIC_DIR = path.join(__dirname, "public");

// ---------------------------------------------------------------------------
// Platform middleware
// ---------------------------------------------------------------------------
app.set("trust proxy", 1); // behind LiteSpeed / reverse proxy: needed for secure cookies and client IPs
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(
  cors({
    origin: config.ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  }),
);

app.use(
  session({
    name: "ocda.sid",
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: "auto", // secure over HTTPS, still works on http://localhost
      maxAge: 1000 * 60 * 60 * 8, // 8 hours of inactivity
    },
  }),
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const clean = (v) => (typeof v === "string" ? v.trim() : v);
const emptyToNull = (v) => {
  const c = clean(v);
  return c === "" || c === undefined ? null : c;
};
const PHONE_RE = /^(\+234|234|0)[789][01]\d{8}$/;
const normalisePhone = (p) => String(p || "").replace(/\s+/g, "");

function requireMember(req, res, next) {
  if (req.session && req.session.member && req.session.member.phone) return next();
  return res.status(401).json({ message: "Your session has ended. Sign in again." });
}

function startMemberSession(req, member) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.member = { id: member.Id, phone: member.PhoneNumber };
      req.session.save((e) => (e ? reject(e) : resolve()));
    });
  });
}

function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d)) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

const authLimiter = rateLimit({ max: 10 });
const resetLimiter = rateLimit({ max: 5, message: "Too many reset attempts. Wait 15 minutes and try again." });

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------
app.use("/admin", adminRoutes);

// ---------------------------------------------------------------------------
// Member: sign up / sign in / sign out / reset
// ---------------------------------------------------------------------------
app.post("/signup", authLimiter, async (req, res) => {
  try {
    const b = req.body || {};
    const phone = normalisePhone(b.phoneNumber);
    const required = { surname: b.surname, otherNames: b.otherNames, sex: b.sex, dob: b.dob, quarters: b.quarters, ward: b.ward, town: b.town, state: b.state };
    for (const [field, value] of Object.entries(required)) {
      if (!clean(value)) return res.status(400).json({ field, message: "This field is required." });
    }
    if (!PHONE_RE.test(phone)) {
      return res.status(400).json({ field: "phoneNumber", message: "Enter a Nigerian mobile number, e.g. 08012345678." });
    }
    if (!b.password || String(b.password).length < 6) {
      return res.status(400).json({ field: "password", message: "Use at least 6 characters." });
    }

    const exists = await request("SELECT Id FROM members WHERE PhoneNumber = @PhoneNumber")
      .inputs({ PhoneNumber: phone })
      .run();
    if (exists.recordset.length > 0) {
      return res.status(400).json({ field: "phoneNumber", message: "This phone number is already registered. Sign in instead." });
    }

    const inputs = {
      othernames: clean(b.otherNames),
      Surname: clean(b.surname),
      email: emptyToNull(b.email),
      Sex: clean(b.sex),
      DOB: clean(b.dob),
      Quarters: clean(b.quarters),
      Ward: clean(b.ward),
      Town: clean(b.town),
      State: clean(b.state),
      PhoneNumber: phone,
      phoneno2: emptyToNull(b.phoneNo2) ? normalisePhone(b.phoneNo2) : null,
      Password: await hashPassword(b.password),
      Title: emptyToNull(b.title),
      HonTitle: emptyToNull(b.honTitle),
      Qualifications: emptyToNull(b.qualifications),
      Profession: emptyToNull(b.profession),
      exitdate: emptyToNull(b.exitDate),
      CreatedAt: new Date(),
    };

    await request(`
      INSERT INTO members
        (othernames, Surname, email, Sex, DOB, Quarters, Ward, Town, State, PhoneNumber, Password, CreatedAt,
         phoneno2, Title, HonTitle, Qualifications, Profession, exitdate)
      VALUES
        (@othernames, @Surname, @email, @Sex, @DOB, @Quarters, @Ward, @Town, @State, @PhoneNumber, @Password, @CreatedAt,
         @phoneno2, @Title, @HonTitle, @Qualifications, @Profession, @exitdate)
    `).inputs(inputs).run();

    const created = await request("SELECT Id, PhoneNumber FROM members WHERE PhoneNumber = @p").inputs({ p: phone }).run();
    if (created.recordset[0]) await startMemberSession(req, created.recordset[0]);

    res.status(201).json({ message: "Account created.", phoneNumber: phone, id: created.recordset[0]?.Id });
  } catch (error) {
    console.error("Signup error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ field: "phoneNo2", message: "One of these phone numbers or the email is already used by another member." });
    }
    res.status(500).json({ message: "Registration failed. Try again later." });
  }
});

app.post("/login", authLimiter, async (req, res) => {
  try {
    const identifier = clean(req.body?.identifier);
    const password = req.body?.password;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Enter your phone number (or member ID) and password." });
    }

    // Short numbers are member IDs; anything that looks like a phone number is a phone number.
    const byId = /^\d{1,9}$/.test(identifier);
    const result = await request(
      `SELECT Id, PhoneNumber, Password FROM members WHERE ${byId ? "Id" : "PhoneNumber"} = @value LIMIT 1`,
    )
      .inputs({ value: byId ? parseInt(identifier, 10) : normalisePhone(identifier) })
      .run();

    const user = result.recordset[0];
    if (!user) {
      return res.status(400).json({ field: "identifier", message: "We couldn't find a member with that phone number or ID." });
    }

    const { ok, needsUpgrade } = await verifyPassword(password, user.Password);
    if (!ok) return res.status(400).json({ field: "password", message: "That password is incorrect." });

    if (needsUpgrade) {
      await request("UPDATE members SET Password = @pw WHERE Id = @id")
        .inputs({ pw: await hashPassword(password), id: user.Id })
        .run();
    }

    await startMemberSession(req, user);
    res.json({ message: "Signed in.", id: user.Id, phoneNumber: user.PhoneNumber });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Sign in failed because of a server error. Try again shortly." });
  }
});

app.post("/logout", (req, res) => {
  if (!req.session) return res.json({ message: "Signed out." });
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout failed:", err);
      return res.status(500).json({ message: "Sign out failed." });
    }
    res.clearCookie("ocda.sid");
    res.json({ message: "Signed out." });
  });
});

// Member password reset: phone number + new password.
app.post("/api/reset-password", resetLimiter, async (req, res) => {
  const phoneNumber = normalisePhone(req.body?.phoneNumber);
  const newPassword = req.body?.newPassword;

  if (!phoneNumber || !newPassword) {
    return res.status(400).json({ message: "Enter your phone number and a new password." });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ message: "Use at least 6 characters for the new password." });
  }

  try {
    const result = await request("UPDATE members SET Password = @pw WHERE PhoneNumber = @phone")
      .inputs({ pw: await hashPassword(newPassword), phone: phoneNumber })
      .run();

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ message: "We couldn't find a member with that phone number." });
    }
    res.json({ message: "Password updated." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Password reset failed because of a server error." });
  }
});

// ---------------------------------------------------------------------------
// Member portal API — always scoped to the signed-in member
// ---------------------------------------------------------------------------
app.get("/api/me", requireMember, async (req, res) => {
  try {
    const result = await request(`
      SELECT m.Id, m.othernames, m.Surname, m.PhoneNumber, m.phoneno2, m.email, m.Sex, m.DOB,
             m.Town, m.State, s.statename AS StateName, m.Ward, m.Quarters, m.Title, m.HonTitle,
             m.Qualifications, m.Profession, m.exitdate, m.CreatedAt
      FROM members m
      LEFT JOIN state s ON s.statecode = m.State
      WHERE m.PhoneNumber = @phone
      LIMIT 1
    `)
      .inputs({ phone: req.session.member.phone })
      .run();

    const u = result.recordset[0];
    if (!u) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Your account could not be found. Sign in again." });
    }

    res.json({
      id: u.Id,
      othernames: u.othernames,
      surname: u.Surname,
      phoneNumber: u.PhoneNumber,
      phoneNo2: u.phoneno2,
      email: u.email,
      sex: u.Sex,
      dob: u.DOB,
      age: ageFrom(u.DOB),
      town: u.Town,
      state: u.State,
      stateName: u.StateName || u.State,
      ward: u.Ward,
      quarters: u.Quarters,
      title: u.Title,
      honTitle: u.HonTitle,
      qualifications: u.Qualifications,
      profession: u.Profession,
      exitDate: u.exitdate,
      memberSince: u.CreatedAt,
    });
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ message: "Your profile couldn't be loaded." });
  }
});

app.put("/api/me", requireMember, async (req, res) => {
  // Map request fields -> columns. The primary phone number is changed by an administrator only.
  const editable = {
    surname: { col: "Surname", required: true },
    othernames: { col: "othernames", required: true },
    sex: { col: "Sex", required: true },
    quarters: { col: "Quarters", required: true },
    ward: { col: "Ward", required: true },
    state: { col: "State", required: true },
    town: { col: "Town", required: true },
    phoneNo2: { col: "phoneno2" },
    email: { col: "email" },
    title: { col: "Title" },
    honTitle: { col: "HonTitle" },
    qualifications: { col: "Qualifications" },
    profession: { col: "Profession" },
    exitDate: { col: "exitdate" },
  };

  const sets = [];
  const inputs = { phone: req.session.member.phone };
  for (const [key, def] of Object.entries(editable)) {
    if (!(key in (req.body || {}))) continue;
    const value = emptyToNull(req.body[key]);
    if (def.required && !value) return res.status(400).json({ field: key, message: "This field can't be empty." });
    if (key === "phoneNo2" && value && !PHONE_RE.test(normalisePhone(value))) {
      return res.status(400).json({ field: key, message: "Enter a Nigerian mobile number, or leave this blank." });
    }
    if (key === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return res.status(400).json({ field: key, message: "Enter a valid email address, or leave this blank." });
    }
    sets.push(`${def.col} = @${key}`);
    inputs[key] = key === "phoneNo2" && value ? normalisePhone(value) : value;
  }

  if (sets.length === 0) return res.status(400).json({ message: "There were no changes to save." });

  try {
    await request(`UPDATE members SET ${sets.join(", ")} WHERE PhoneNumber = @phone`).inputs(inputs).run();
    res.json({ message: "Profile saved." });
  } catch (err) {
    console.error("Profile update error:", err);
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(400).json({ message: "That second phone number or email is already used by another member." });
    }
    res.status(500).json({ message: "Your changes couldn't be saved." });
  }
});

app.get("/api/me/receipts", requireMember, async (req, res) => {
  try {
    const result = await request(`
      SELECT id, amount, remark,
             DATE_FORMAT(transdate, '%Y-%m-%d') AS transdate,
             DATE_FORMAT(paydate, '%Y-%m-%d') AS paydate
      FROM memberledger
      WHERE phoneno = @phone
      ORDER BY transdate DESC, id DESC
    `)
      .inputs({ phone: req.session.member.phone })
      .run();
    res.json(result.recordset);
  } catch (err) {
    console.error("Receipts error:", err);
    res.status(500).json({ message: "Your receipts couldn't be loaded." });
  }
});

// Community totals by ward or quarter. Returns totals only — never other members' payments.
app.get("/api/enquiry/:type/:value", requireMember, async (req, res) => {
  const { type, value } = req.params;
  const { from, to } = req.query;
  const column = { ward: "Ward", quarters: "Quarters" }[type];
  if (!column) return res.status(400).json({ message: "Choose ward or quarter." });

  let sql = `
    SELECT m.Ward AS ward, SUM(ml.amount) AS amount, COUNT(DISTINCT ml.phoneno) AS members
    FROM memberledger ml
    JOIN members m ON ml.phoneno = m.PhoneNumber
    WHERE m.${column} = @value`;
  const inputs = { value };
  if (from) { sql += " AND ml.transdate >= @from"; inputs.from = from; }
  if (to) { sql += " AND ml.transdate <= @to"; inputs.to = to; }
  sql += " GROUP BY m.Ward ORDER BY m.Ward";

  try {
    const result = await request(sql).inputs(inputs).run();
    res.json(result.recordset.map((r) => ({ ward: r.ward, amount: Number(r.amount || 0), members: Number(r.members || 0) })));
  } catch (err) {
    console.error("Enquiry error:", err);
    res.status(500).json({ message: "The enquiry couldn't be run." });
  }
});

// ---------------------------------------------------------------------------
// Pages & static files
// ---------------------------------------------------------------------------
app.get("/dashboard", (req, res) => res.sendFile(path.join(PUBLIC_DIR, "dashboard.html")));

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.includes(`${path.sep}photos${path.sep}`)) {
        res.setHeader("Cache-Control", "public, max-age=604800"); // 7 days
      } else if (/\.(html|css|js)$/.test(filePath)) {
        // Always revalidate pages, styles and scripts so updates show up straight away
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }),
);

app.use("/api", (req, res) => res.status(404).json({ message: "Not found." }));
app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html")));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return;
  res.status(500).json({ message: "Something went wrong on the server." });
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason && reason.stack ? reason.stack : reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err.stack || err);
});

app.listen(config.PORT, () => {
  console.log(`OCDA server running on http://localhost:${config.PORT}`);
});
