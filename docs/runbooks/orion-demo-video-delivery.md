---
verified: 2026-11-19
review_after: 2026-12-19
topics: [orion-demo-video, stripe, fulfillment]
references:
  - api/orion-demo-video.ts
  - specs/orion-demo-video-delivery-spec.md
  - tests/orionDemoVideoDelivery.test.ts
---

# Orion Demo Video checkout and delivery

The source tests use simulated Stripe and Resend responses. Run the sandbox rehearsal before activating the live checkout. Get operator approval for provisioning secrets, merging and deploying, and activating the live Payment Link.

## Configure a sandbox rehearsal

1. In the Orion Apex Capital Stripe sandbox, create a one-time $10 USD price and a dedicated Payment Link for one Orion Demo Video. Select card payments, fixed quantity one and USD. Disable promotion codes, adaptive pricing, adjustable quantities and shipping. Confirm sales tax settings with the seller. Stripe hosts payment and can send a separate payment receipt.
2. Set the Payment Link's after-payment redirect to the externally reachable Vercel rehearsal origin plus `/api/orion-demo-video?session_id={CHECKOUT_SESSION_ID}`. Use an approved preview that Stripe can reach. Production will use `https://www.danmercede.com`.
3. Register a Stripe snapshot event destination for that same origin at `/api/orion-demo-video`, subscribed to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Record the correct destination's signing secret in Vercel. The application filters events to the dedicated link. Set up a verified Resend sender with order support and disable link tracking for this delivery message.
4. Add the variables below as server-only Vercel project configuration. Scope them only to the rehearsal or Production as appropriate. Use sensitive variables for credentials and ZIP data. Keep the preview and production keys separate. Grant the restricted Stripe key the Checkout Sessions read and write permissions needed for lookup and metadata updates, with read access for expanded prices, PaymentIntents and charges. Confirm the actual required permissions in the rehearsal.

| Variable | Value |
| --- | --- |
| `ORION_DEMO_STRIPE_KEY` | Restricted key for this Stripe mode and seller |
| `ORION_DEMO_STRIPE_PAYMENT_LINK_ID` | Dedicated `plink_…` resource ID |
| `ORION_DEMO_STRIPE_PRICE_ID` | One-time `price_…` resource ID |
| `ORION_DEMO_STRIPE_WEBHOOK_SECRET` | This event destination's `whsec_…` value |
| `ORION_DEMO_RESEND_KEY` | Sending-only key for the verified sender domain |
| `ORION_DEMO_EMAIL_FROM` | Verified order sender address or display name and address |
| `ORION_DEMO_ZIP_BASE64` | Approved ZIP bytes as one line of Base64 |
| `ORION_DEMO_ZIP_SHA256` | Lowercase hex SHA-256 of the approved ZIP |
| `ORION_DEMO_PUBLIC_ORIGIN` | Exact HTTPS Vercel preview origin without a trailing slash. Production uses the canonical site origin. |

Use the locally verified artifact and its checksum. The current archive is about 10 KB. Keep it out of the repository, public build directory, command history and logs. The function accepts at most 32,768 Base64 characters. Vercel's environment size limit also applies to the entire deployment.

## Verify before release

- On the deployed preview, open the real sandbox Payment Link as a buyer. Complete a sandbox purchase with Stripe's test card. Verify the Stripe redirect, the `application/zip` attachment, the downloaded ZIP's SHA-256 and archive integrity. Verify the recovery email in the receiving inbox and use its link to download and verify the same archive.
- In Stripe, confirm the signed event received a 2xx response and the completed session has the `orion_demo_video_delivery` metadata entry. Resend the same event from Stripe. Confirm a single email and the same metadata receipt. Verify both an unpaid session and the original session after a sandbox refund are denied.
- After production secret and deployment approval, apply the exact tested configuration using live-mode IDs and the canonical origin. Confirm the live endpoint is on the intended site revision, requests without a purchase receive 404, and required provider permissions and event destination are correct. Keep the live link private until checkout and fulfillment are verified. A live paid test requires separate spend authorization.
- Hand the verified Stripe-hosted checkout URL and listing to the marketplace reviewer. Keep the checkout session ID, recipient and signed event contents out of the review packet.

## Monitor and recover

Watch failed deliveries in the Stripe event destination and Resend delivery or bounce status. A Stripe metadata receipt records Resend acceptance. Use the receiving inbox to verify delivery. The download URL is a bearer credential. Keep it and HTTP query strings out of shared logs or support threads. Verify ownership against the paid Stripe order before granting manual recovery.

A checkout return works independently of webhook email. If the webhook reports repeated failures, inspect the exact Stripe session and Resend logs through their dashboards. Check for a successful earlier email before any manual send. Automatic sends stop after 22 hours even when the Stripe receipt could not be recorded. Refunds or disputes revoke future downloads while previously saved copies remain on the buyer's device.

If fulfillment breaks in production, disable the dedicated Payment Link first to prevent new orders. Preserve Stripe events, receipts and the approved archive. Restore the last working function and its matching configuration, verify access for existing buyers, then reopen the link with approval. If the API must stay offline, fulfill verified existing orders manually through order support.

[Stripe fulfillment](https://docs.stripe.com/checkout/fulfillment) · [Stripe Payment Link redirects](https://docs.stripe.com/payment-links/post-payment) · [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
