# Selling OGE UI Pro on Lemon Squeezy — setup runbook

ADR 0004 picked Lemon Squeezy as merchant of record and a self-service claim page for keys. The
code side is done: `api/license/claim.mjs` turns a paid order into a signed key, `/license/claim` is
the page buyers use, and `PRO_CHECKOUT_URL` in `apps/dev-app/src/app/shared/pro-license.ts` switches
the pricing button from "Get a quote" to "Buy OGE UI Pro". This runbook is what is left to do in the
Lemon Squeezy and Vercel dashboards, in order, with a check after each step.

> **Product shape matters.** The claim endpoint dates a key from the order's `created_at` and reads
> the seat count from the order's quantity. Lemon Squeezy subscription renewals produce invoices,
> not new orders — so a subscription product would leave renewing customers on their first key.
> Sell OGE UI Pro as a **single payment** of $299 per seat that buyers buy again to renew.

## 1. Account and store (test mode)

1. Sign up at lemonsqueezy.com and create a store named **OGE UI** (currency USD). Every store
   starts in test mode; nothing below charges real cards until step 6.
2. Store settings: support email `license@ogeui.com`, website `https://www.ogeui.com`, logo from
   `apps/dev-app/public/favicon-192.png`.
3. Note the numeric **Store ID** (Settings → Stores) — this is `LEMONSQUEEZY_STORE_ID`.

## 2. The product

1. Products → New product: **OGE UI Pro**.
2. Description: "Commercial license for the OGE UI Pro families — Pivot Grid, Gantt, Scheduler,
   Kanban, Charts, BPMN Editor and Spreadsheet — for Angular and React. One seat per developer.
   Includes 12 months of updates; every version released in that window stays licensed forever."
3. Pricing: **Single payment**, **$299**. Tax category: software / digital product.
4. Leave the default variant (one variant is enough; the quantity is the seat count).
5. Confirmation: set the thank-you message / receipt note to
   "Get your license key at https://www.ogeui.com/license/claim with this order number and email."
   and a receipt button to the same URL.
6. Publish the product. Note the **Product ID** — this is `LEMONSQUEEZY_PRODUCT_ID`.
7. Share → copy the checkout link. Seats are the order quantity: the product's share options can
   preset a quantity, and a link ending in `?quantity=5` opens the checkout with five seats.

## 3. API key

Settings → API → create a key named `ogeui-claim` (test mode while the store is in test mode). This
is `LEMONSQUEEZY_API_KEY`. It is only used to read orders.

## 4. Check everything locally

```bash
LEMONSQUEEZY_API_KEY=… LEMONSQUEEZY_STORE_ID=… LEMONSQUEEZY_PRODUCT_ID=… \
  node tools/license/check-store.mjs
```

It verifies that the signing key matches the public key embedded in `@oge-ui/core`, that the API
key, store and product line up, that the product is published and that every variant is a single
payment. Then place a test order (Lemon Squeezy test card `4242 4242 4242 4242`, any future date,
any CVC) with quantity 2 and run the same command with
`--order <order number> --email <buyer email>` — it calls the real claim handler and must print a
key with 2 seats.

## 5. Wire the docs site

1. In the Vercel project that serves www.ogeui.com, add (Production and Preview):
   `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_PRODUCT_ID` and
   `OGE_LICENSE_PRIVATE_KEY` (the full PEM from `~/.oge-license/private-key.pem`, newlines kept or
   written as `\n` — `loadPrivateKey` accepts both). Never commit any of them.
2. Set `PRO_CHECKOUT_URL` in `apps/dev-app/src/app/shared/pro-license.ts` to the checkout link,
   push, and wait for the deploy.
3. Open `/license/claim`, enter the test order number and email: a key must appear. A wrong email
   answers "No order with that number and email."; a refunded order answers that only paid orders
   carry a license.

## 6. Go live

1. Settings → Activate store: answer the business questionnaire and complete identity
   verification (KYC/KYB). Approval usually takes a few business days.
2. Payouts: add a bank account (Turkey is on Lemon Squeezy's bank-payout list; payouts are in USD)
   or PayPal.
3. Once live, create a **live-mode** API key and replace `LEMONSQUEEZY_API_KEY` in Vercel — the
   test key cannot see live orders. Store and product IDs stay the same.
4. Re-run `check-store.mjs` with the live key (it prints `LIVE-mode key`), buy one seat yourself,
   claim it, then refund it from the Orders page.

## 7. Day to day

- **New sale:** nothing to do; the buyer claims the key. A buyer who lost the key claims it again.
- **Renewal:** the buyer buys again; the new order yields a key dated from the new purchase.
- **More seats:** a new order with the extra quantity, or a manual key with the total
  (`node tools/license/issue.mjs --licensee … --seats …`).
- **Refunds:** refund in Lemon Squeezy; the claim page stops issuing keys for that order. Keys
  already issued keep verifying (they are offline), which is the accepted trade-off of ADR 0004.
- **Invoices, purchase orders, volume pricing:** arrive at `license@ogeui.com`; issue keys by hand
  with `issue.mjs` and record the `--id` you used.
