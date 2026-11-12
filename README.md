# Fast Find Label (Astro)

One-page static site: product, photos, quantity choices, checkout, tagline map.

## Run
    npm install
    npm run dev      # http://localhost:4321
    npm run build    # outputs dist/

## Repo must contain ONLY these source pages
`src/pages/index.astro`. Delete any old `guide.astro`, `faq.astro`, `contact.astro`, `order.astro`
and `src/components/Label.astro` from GitHub. They reference text that no longer exists and break the build.

## Deploy (free, commercial use allowed: Cloudflare Pages)
Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git > pick the repo.
Framework preset: Astro. Build command: `npm run build`. Output: `dist`.
Then Custom domains > add fastfindlabel.com (and www) and follow the DNS steps shown.
(Vercel's free Hobby plan does not allow sites that take payments; Vercel Pro is paid.)

## Edit
- All text, prices, map stops, email, PayPal ID: `src/data/content.js`.
- Styles: `src/styles/global.css`. Behaviour: `src/scripts/client.js`.

## Orders, payments and Bob's admin page
- Checkout runs through Cloudflare Pages Functions in `functions/api/` (helpers in `server/`).
  The server sets the price from `src/data/content.js`, creates the PayPal order, captures it and checks
  the amount before an order counts as paid. Orders are saved in a Cloudflare D1 database (tables are created automatically).
- Bob's page: `/admin/` (password login). Orders list, Not printed / Printed / Shipped tabs, Download Excel
  (name | street+apt | "City ST" | ZIP, no header), Copy next 30 addresses, Mark printed / shipped / refunded,
  Orders on/off switch and daily limit.

### Cloudflare settings (Workers & Pages > fastfindlabel > Settings)
Bindings: D1 database, variable name `DB` (one database for Production, a separate test one for Preview).
Variables and Secrets (set for Production AND Preview separately):
| Name | Production | Preview |
|---|---|---|
| `PAYPAL_ENV` | `live` | `sandbox` |
| `PAYPAL_CLIENT_ID` | live app Client ID | sandbox app Client ID |
| `PAYPAL_SECRET` (encrypt) | live app Secret | sandbox app Secret |
| `ADMIN_PASSWORD` (encrypt) | Bob's password | a test password |
After changing settings, redeploy (Deployments > ... > Retry deployment).
Never put secrets in the code or in chat.

### Opening and pausing orders
Bob does it in `/admin/` (Open orders / Pause orders). The shop also stays closed if PayPal settings are missing
or the daily limit is reached.
