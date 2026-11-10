# HANDOFF: Fast Find Label website (full project explanation)

Paste this whole file into a new chat and attach the project zip. Then ask the new chat to work through section 7 in order. Work one step at a time, and say plainly what could not be tested.

## 1. People and project
- **Me:** Eric, runs a small web design studio called CleanAce. I do all the work myself.
- **Client:** Bob R, a US retiree on a tight budget. He sells **Fast Find Label**: adhesive, thermal-printed stickers that carry the phone number of someone you trust (a relative or close friend, NOT the lost phone's own number), so whoever finds a lost phone knows who to call.
- **Goal:** a very simple site where customers pick a pack, enter the trusted number and shipping address, and pay. Bob wants 30+ orders a day (about $300 a day in sales), so his workflow must stay fast.
- **Market:** USA only for now.

## 2. Commercial terms (as agreed)
- Website fee: **$250, paid in full by Bob** (a discounted first-project price).
- Domain **fastfindlabel.com** (about $15 a year) and hosting (about $120 a year, my estimate, verify against the real plan): **$135 total, due when Bob is paid around November 25** (his 4th Wednesday). He could not pay earlier; do not pressure him. I will send exact payment details then.
- The domain must end up in **Bob's name**. I may register it first and transfer it after he reimburses me.
- Business email (about $8 a month) is **optional and not chosen**. Bob uses Gmail: **fastfindlabel@gmail.com** (confirmed twice). Mail sent from a Gmail address often lands in spam, so use a transactional email service for order emails.
- Second site **cellfindnow.com** with cellfindnow@gmail.com, same design and same PayPal: offered at **$250, to be built later** (December or next year), after the first site sells. Not started.
- Prices before shipping: **2 labels $10, 4 labels $18, 6 labels $25**. The 4 and 6 prices are MY proposals and still need Bob's confirmation. Shipping is a **flat $3 per order**, any size. Delivery text: "Please allow 5 to 7 days for delivery."
- One PayPal **Business** account is enough for both sites. Bob will set it up once the site is live (PayPal wants a website). I need only his **Client ID** (never his password).

## 3. Bob's design decisions (keep exactly; do not add anything back without asking him)
Bob asked for the simplest possible site. It is ONE page, in this order:
1. Product name **Fast Find Label**, big. Under it, smaller: **Your Phone's way Home**, shown as an **underlined link that opens a map** (see below).
2. Blurb: "An adhesive label with the phone number of someone you trust, a relative or close friend, **NOT** the number of the lost phone." Then: "The label can be placed on the back of your phone or on the phone case. It is thermal printed, smear proof and waterproof."
3. His **two real photos** (phone back and phone case), then, under the second image, **Get My Labels**.
4. Under "Get My Labels", in smaller letters: "(Shipping To USA only.)" and "Please allow 5 to 7 days for delivery."
5. Quantity choices as a radio list: "2 labels $10 + $3 shipping", "4 labels $18 + $3 shipping", "6 labels $25 + $3 shipping". Shipping is otherwise shown only at checkout, as "$10 + $3 shipping = $13".
6. Checkout: phone number to print (US, 10 digits, formatted as typed; hint says NOT the number of the phone being labeled), name, email, street, Apt/Suite (optional), city, state, ZIP. Apt shows on the same line as the street. Pay with PayPal.
7. Footer: "Contact:" with fastfindlabel@gmail.com as a **blue underlined mailto link**, and "©2026 RFR FastFindLabel".
- **The map:** clicking the tagline opens a dialog with a small route map and six stops (coffee, grocery, gym, car, park, home), Back/Next buttons, a moving phone dot and a short tip per stop. It is the only extra Bob wanted back.
- Removed on purpose: intro animation, drag-the-label toy, guide, FAQ, extra pages, feature boxes, statistics, reviews, trust strip, sticky buy bar. Never mention lanyards, key tags or keys.
- Bob was happy: "This site is sooo easy to understand and generate sales."

## 4. Label spec (the physical product)
Horizontal sticker, three centered lines, straight:
```
If found, call (555) 555-5555
fastfindlabel@gmail.com
©2026 RFR FastFindLabel
```
Only the number changes per customer. Customer emails are never printed. Bob's current photos still show the OLD email (cellfindnow@gmail.com); **new photos arrive in about a week** (he ran out of label tape). When they arrive: crop out anything personal, strip metadata, and replace `public/images/phone-back.jpg` and `phone-case.jpg`. (The old case photo showed a business card with part of an address; it is already cropped out.)

## 5. Technical state
- **Stack:** Astro 5 static site in a GitHub repo, deployed on Vercel. Earlier preview: https://fastfindlabels.vercel.app/ . No database yet.
- **Files:** `src/pages/index.astro` (the whole page), `src/layouts/Base.astro` (head, footer, script), `src/data/content.js` (ALL text, prices, shipping, map stops, email, PayPal client ID placeholder), `src/scripts/client.js` (price total, phone formatting, demo or PayPal checkout, map dialog), `src/styles/global.css` (light paper-green background, mint, sky, yellow, navy text; Fraunces headings, Figtree body; focus styles; reduced-motion respected), `public/images/` (two photos), `README.md`.
- **What was tested:** I could not install Astro in my earlier chat (no network). I generated a static copy of the same page and ran it in a headless browser at desktop and phone sizes: totals update, number formatting, demo order, map opens, steps to stop 6 and closes, no console errors, no sideways scroll. **The Astro files themselves have not been built by me.**
- **Known problem:** the latest Vercel deployment **failed** and I have not seen the build log. A possible cause is leftover old files in the GitHub repo (the old `guide.astro`, `faq.astro`, `contact.astro`, `order.astro` and `src/components/Label.astro` should be deleted; `src/pages/` should hold only `index.astro`). First action: get the build log (Vercel, Deployments, the failed one, Build Logs, or `npx vercel inspect <id> --logs`), fix the real error, and confirm a green deploy.
- **Placeholder:** `paypalClientId` in `content.js` is "[PayPal client ID]". Until it is a real ID, checkout is a demo that charges nothing.

## 6. How the real payment and orders should work (not built yet)
Use PayPal Checkout with server-side order creation and capture. Never trust prices from the browser.
1. Customer picks a pack and fills the form.
2. `POST /api/orders/create`: the server validates everything, computes total = pack price + $3 from its own price list, creates the PayPal order (`custom_id` = our order id, description includes pack and trusted number), saves it as `pending`.
3. PayPal buttons approve; `POST /api/orders/capture`: the server captures, checks COMPLETED and the amount, marks the order `paid`, emails the customer and Bob.
4. Backup: `POST /api/paypal/webhook` (PAYMENT.CAPTURE.COMPLETED, signature verified).
5. Secrets (PayPal Client ID and Secret, admin password, email key) in Vercel environment variables. `PAYPAL_ENV=sandbox|live`; an env-flagged $1 test pack for Bob's live test (he refunds it).
6. Storage: a small database through Vercel's marketplace (for example Upstash Redis or Neon Postgres). Per order: id, createdAt, status (pending, paid, printed, shipped, refunded), pack, quantity, trusted number, name, email, street with Apt, city, state, ZIP, total, paypalOrderId, site. No card data is stored. Add validation, rate limits and a privacy policy.
7. Needs the `@astrojs/vercel` adapter and `export const prerender = false` on API endpoints.

## 7. Owner page for Bob (not built yet)
Private `/admin/` page (password login, secure cookie, noindex, unlinked, works on a phone):
- List of paid orders, newest first, with status; filter "not yet printed".
- **Download Excel**, no limit on rows, **exactly like Bob's sample**: no header row, no blank rows; column A name, B street (with Apt on the same line), C "City State" (for example "Tiffin OH"), D ZIP stored as text. Bob tested his address-label app with that layout; **no blank line between addresses is needed**.
- **Copy next 30 addresses** to the clipboard for the app's "Paste list" (30 labels per sheet), then "mark these 30 as printed".
- For each order, the trusted number shown large (Bob types it by hand into the Nelko app), pack size, and a "mark shipped" button.
- A "pause orders" switch and an optional daily cap, in case he gets swamped.

## 8. Remaining steps, in order
1. Fix the failed Vercel deploy (section 5).
2. Confirm with Bob the 4 and 6 label prices.
3. When his new photos arrive, swap them in.
4. Backend, owner page and sandbox testing (sections 6 and 7).
5. After he pays (about Nov 25): register fastfindlabel.com, set up hosting (verify the real cost, free plans may be enough for a static site but check commercial-use terms), connect the domain, update `site` in `astro.config.mjs`, add a sitemap.
6. Bob creates his PayPal Business account and sends the Client ID; set it up; run a real $1 test order and refund it.
7. Add Privacy, Shipping and Returns pages (PayPal and customers expect them); only if Bob agrees to extra pages. Check sales-tax rules with a professional.
8. Full end-to-end test on desktop and phone: an order, the Excel export, the 30-address copy pasted into his app, a label printed from his Nelko app.
9. Launch quietly with a few real orders. Then, later, the second site (cellfindnow.com) using one config per site and one shared order list with a `site` field.

## 9. How Bob works (design for this)
He prints each label in the Nelko app (typing the number by hand; the site cannot print directly to the printer), packs it in a coin envelope (about $0.03), adds an address label (about half a cent) and a stamp (about $0.83), and mails in batches. Every order should give him the number and address in one clear place. His costs per order are about $0.87 plus PayPal's fee, so the flat $3 shipping covers postage.

## 10. Money and reporting notes
- PayPal, Stripe and Square all report payments to the IRS on the same rules (federal 1099-K threshold of $20,000 and 200 transactions according to sources I read; card payments may report at any amount; some states are lower). Switching processors does not avoid reporting, and income is taxable anyway; he should ask a tax professional, and also how business income may affect any benefits he receives.
- Re-verify any fee or price figure before quoting it to Bob.

## 11. How to communicate and behave
- Bob prefers short, plain, friendly Telegram messages. Important things (prices, payment details) are confirmed by email too, so there is a written record.
- Be gentle about money. He told me his budget is tight. Offer cheaper options when they exist.
- Do not invent facts, reviews or guarantees. Use [brackets] and ask me.
- Never put customer data, secrets or Bob's personal details in code or examples.
- Keep the design simple and accessible. Keep the text in `content.js`.
- Tell me plainly what you could not test.