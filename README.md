# DoorHold — property management software

## Live links
- **Live app:** temporary hosting for now; moving to the owner's own Cloudflare account and domain.

Multi-company (SaaS) property management: properties, units, tenants, leases, rent and charges, double-entry books (journal, trial balance, reports, owner statements, 1099s), bank import and reconciliation, repair requests / work orders with a contractor portal, tenant and owner portals, an installable phone app (PWA, under `/app`), a manager command bar ("assistant"), tasks, and a platform-owner back office for signups, plans and usage. Every company's data is kept separate.

## Tech stack
- **Backend:** one Cloudflare Worker, `site/_worker.js` (plain JavaScript, no framework, no build step). It serves the JSON API under `/api/` and the static files.
- **Database:** Cloudflare D1 (SQLite), binding `DB`. The schema is created and migrated automatically on first request (`CREATE TABLE IF NOT EXISTS …`, additive changes only) — there is no separate migrations folder.
- **File storage:** Cloudflare R2, binding `FILES` (documents, photos, PDFs).
- **Frontend:** static single-page app — `site/index.html`, `site/app.js`, `site/app.css` (+ `.min` versions), phone app in `site/app/`, owner portal `site/owner.html`, contractor page `site/fix.html`. Vendor libs (pdf.js, SheetJS) in `site/vendor/`.
- **Tests:** Node's built-in test runner (`test/*.test.mjs`) against a local dev server that emulates D1 with `node:sqlite` and R2 with the file system.

## Run locally
Requires **Node.js 22+** (for `node:sqlite`).
```bash
node --no-warnings test/dev.mjs site 8787      # http://localhost:8787  (data in /tmp/pmdev; delete dev.db to reseed)
node --test test/*.test.mjs                    # test suite (most tests start their own dev server)
```
Some API tests sign in with demo accounts read from a local file `demo-logins.local.txt` (not in this repo); without it those tests fail at sign-in. Sample data in the code and tests uses made-up names and addresses.

Or with Wrangler: `cd site && npx wrangler dev` (create a local D1 first, see below).

## Build
The browser code is `site/app.js` + `site/app.css`; the minified files the site serves are rebuilt with:
```bash
node test/build.mjs      # writes site/app.min.js and site/app.min.css
node --test test/*.test.mjs   # full test suite (in-memory SQLite, no Cloudflare needed)
```
Requires Node 20+. No npm install is needed for the app itself.

## Deploy (Cloudflare Workers + D1 + R2)
```bash
cd site
npx wrangler d1 create doorhold             # paste the database_id into wrangler.toml
npx wrangler r2 bucket create doorhold-files
npx wrangler deploy
```
Then add your custom domain to the Worker in the Cloudflare dashboard. Optional secrets: `npx wrangler secret put NAME` for each variable below.

Your data (companies, tenants, books, uploaded files) lives in the D1 database and R2 bucket, not in this repo. To copy it to your own Cloudflare account, export the current database (`npx wrangler d1 export <db> --output data.sql`) and import it into yours (`npx wrangler d1 execute doorhold --remote --file data.sql`).

It could also run on Node + SQLite (the `test/dev.mjs` server already does this with a D1/R2 shim), but Cloudflare is how it was built and tested.

## Environment variables (all optional)
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `AI_BASE_URL`
- `AI_BASE_URL_ANTHROPIC`
- `STRIPE_SECRET_KEY`
- `STRIPE_CONNECT_CLIENT_ID`
- `PAYMENTS_LIVE`
- `PLAID_CLIENT_ID`
- `PLAID_SECRET`
- `PLAID_ENV`
- `UTILITY_API_TOKEN`
- `PM_MFA_KEY`
- `ENTITY_KEY`
- `TWILIO_BASE`
- `PM_TODAY`
- `PM_PROV_MS`
- `SHARED_EMAIL_FROM`
- `SHARED_EMAIL_KEY`

AI keys enable smarter parsing in the assistant and document reading; Stripe/Plaid/utility keys switch on live payments, bank feeds and utility data (off by default: payments run in demo mode). `PM_MFA_KEY` is a 64-hex-char key used to encrypt two-factor secrets. `PM_TODAY` is a test hook only.

## More
See `DEVELOPER.md` for architecture notes and the feature-by-feature change log.
