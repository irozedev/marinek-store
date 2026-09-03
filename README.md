# marinek.store

Landing site and paid-access system for an online fitness program. In production since July 2026 at [marinek.store](https://marinek.store).

**Next.js 14** (App Router, `output: 'export'`) · **TypeScript** · **Tailwind CSS** · **Netlify Functions** · **WayForPay** · **Telegram Bot API** · **Resend**

Client project. Ukrainian notes: [README.uk.md](README.uk.md).

---

## What it does

A visitor picks one of three tiers, pays by card, and is granted access to a private Telegram channel — automatically, with no manual step on the owner's side.

The site is fully static. Everything that cannot be static — pricing, payment creation, signature verification, access delivery — runs in Netlify Functions.

## The part worth reading

Money and access control are the real problems here. Three decisions:

### Prices never come from the client

The plan catalogue lives server-side in `netlify/lib/plans.ts`. The browser sends a plan id, never an amount. If the amount travelled with the request, anyone could rewrite it and buy the $150 tier for one unit of currency.

### The return URL is not evidence of payment

WayForPay POSTs the browser back to a single `returnUrl` — the Purchase API has no separate decline URL, so success and failure have to be told apart locally. The body carries the same HMAC_MD5 signature as the webhook.

That gives a trust ordering, most reliable first:

1. **Signature verifies** → trust `transactionStatus` in both directions
2. **No signature** → fall back to the order status in the database, which only the signed webhook can write
3. **Nothing recognised** → render the neutral page, whose copy is deliberately written so it never claims a payment that may not have happened

An unsigned body is trusted **only in the failure direction**. Trusting it the other way would let anyone POST a fake success and be handed access.

### Invites are single-use by construction

Access is a Telegram invite created with `member_limit: 1`. The link dies on first join, so it cannot be forwarded.

This replaced an earlier join-request flow: `member_limit` and `creates_join_request` are mutually exclusive, and the limit is both stricter and free of the manual moderation the owner previously did by hand.

Invite lookup masks the address it echoes back (`ma****@gmail.com`), so the endpoint cannot be used to test whether a given email bought anything.

## Layout

```
src/app/                    static routes — landing, offer, privacy, rules, thank-you
netlify/functions/
  create-payment.ts         server-priced order, signed WayForPay request
  wayforpay-callback.ts     signed webhook — the only writer of paid status
  payment-return.ts         browser return, three-tier trust described above
  get-invite.ts             invite lookup with masked email echo
  reissue-invite.ts         re-issue after expiry
  resend-invite.ts          re-send the delivery email
  list-orders.ts            owner dashboard
  publish-site.ts           content publishing
netlify/lib/
  plans.ts                  server-side price catalogue
  wayforpay.ts              HMAC_MD5 signing and verification
  telegram.ts               single-use invite creation and revocation
  email.ts                  Resend delivery, seller details matching the offer
  db.ts                     order storage
```

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing |
| `/oferta` | Public offer (contract) |
| `/privacy` | Privacy policy |
| `/rules` | Terms of use |
| `/thank-you` | Post-payment, `noindex`, redirects to Telegram by `?plan=` |
| `/payment-failed` | Failed payment, `noindex` |

## Running locally

```bash
npm install
cp .env.example .env      # read by `netlify dev`
npm run dev               # http://localhost:3000
```

`.env.example` documents every variable and which are build-time (`NEXT_PUBLIC_*`, inlined into the client bundle and visible in page source) versus runtime-only. Secrets never carry the `NEXT_PUBLIC_` prefix; changing a public one requires a rebuild.

## Notes

Seller details in `netlify/lib/email.ts` must match `src/app/oferta/page.tsx` — they appear on the customer's card statement, and a mismatch with the published offer is a compliance problem rather than a cosmetic one.

Prices in `plans.ts` must match the currency configured on the WayForPay merchant account.
