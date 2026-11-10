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

## PayPal
Set `paypalClientId` in `src/data/content.js` to Bob's LIVE Client ID (never the secret). Until then
the Pay button says checkout opens soon and takes no order.
Each payment then appears in Bob's PayPal with the shipping address; the description holds pack size,
number to print and customer email. The price is set in the browser for now, so Bob must check that the
amount matches the pack before shipping. The server checkout in HANDOFF.md section 6 removes that risk.
