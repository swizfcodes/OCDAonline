# OCDA Online

Website, member portal and admin console for the Oyin-Akoko Community Development Association — https://oyinakokocda.org

## Run it

```bash
npm install
cp .env.example .env   # then fill in the database details and JWT_SECRET
npm start              # http://localhost:5500
```

Requires Node 18+ and MySQL.

## What's where

| Path | Purpose |
| --- | --- |
| `server.js` | Express app: member sign up / sign in, member portal API, static files |
| `routes/admin.js` | Admin API (`/admin/*`): members, ledger, expenses, reports, website content |
| `lib/` | Config, password hashing, rate limiting |
| `db.js`, `db-wrapper.js` | MySQL pool and the `request` query helper (`@name` parameters) |
| `public/` | Pages, styles and browser scripts |
| `public/styles/tokens.css` | Colours, type and spacing shared by every page |
| `public/styles/site.css` | Public site, sign-in pages and form components |
| `public/styles/portal.css` | Member portal layout |
| `public/styles/admin-theme.css` | Admin consoles (re-skins the Tailwind utilities those pages use) |
| `sql/` | One-off SQL scripts (schema notes, seed data, migrations) |

## Pages

- Public: `/` (home), `/aboutus.html`, `/news.html`, `/faq.html`, `/contact.html`
- Members: `/member.html` (sign in), `/signup.html`, `/forgotpassword.html`, `/dashboard`
- Administrators: `/adminlog.html`, `/admin-dashboard.html`, `/viewadmin-dashboard.html` (view-only role)

## Security notes

- **Passwords are hashed with bcrypt.** Existing plain-text passwords are upgraded automatically the next time each member or administrator signs in successfully.
- **Member data is tied to the signed-in session.** The portal API (`/api/me`, `/api/me/receipts`) only ever returns the signed-in member's own records; ward/quarter enquiries return totals only.
- **Password resets**: members reset with their phone number, administrators with their email address (`/forgotpassword.html`, `/adminforgotpassword.html`). Both are rate limited. A super administrator can also set a new password from Administrators → Edit.
- Every write to `/admin/*` needs a valid token; view-only admins (`VIEWADMIN`) can't change anything. Managing administrators is limited to super admins.
- Sign-in and reset endpoints are rate limited.
- Sessions use the in-memory store, so members are signed out when the server restarts.
