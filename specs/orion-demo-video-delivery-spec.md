# Orion Demo Video delivery

Swap Meet's first paid listing uses a seller-owned Stripe Payment Link for one Orion Demo Video ZIP at a one-time price of $10 USD. Stripe hosts checkout. The buyer can download immediately on danmercede.com and gets a recovery link by email.

## Requirements

1. Configure one card-only Stripe Payment Link, one one-time price and quantity one. The line item is $10 USD. Stripe-calculated tax can increase the total. Discounts, shipping charges and currency conversion are outside this checkout.
2. Stripe redirects the buyer to `/api/orion-demo-video?session_id={CHECKOUT_SESSION_ID}`. The landing page and every download request retrieve the Checkout Session from Stripe. The session must belong to the configured link, price and Stripe mode. Payment must be settled and the charge must be captured, undisputed and free of refunds.
3. The download is available for 30 days from payment. The checkout session ID grants access for that period. Treat it as a private link. Every response is uncacheable and suppresses cross-site referrers. The page has no third-party resources. The archive is private server configuration and its SHA-256 digest must match before the handler serves it.
4. A signed Stripe event for the configured link re-verifies the purchase and emails the buyer at the address returned by Stripe. Resend deduplicates sends by session ID. The handler records the accepted message ID in Stripe session metadata. Automatic retries are bounded to the first 22 hours of payment to fit inside Resend's 24-hour idempotency window. The download page remains available while an email issue is resolved.
5. Test checkout uses a separate Stripe environment, signing key and Vercel preview. Missing configuration or unavailable providers cause a temporary failure. Invalid purchases, unknown sessions and cross-mode session IDs provide no download.

## Verification

- Node 20 tests cover the return and ZIP responses, their headers, rejected payments and signatures, the retry limit, and Resend acceptance followed by a failed Stripe receipt write.
- Before sharing the seller checkout, run a real Stripe sandbox purchase through the deployed function. Confirm the browser download and email link yield the approved archive digest, the signature is accepted, the metadata receipt persists, and a refund revokes access.
- [Deployment and recovery procedure](../docs/runbooks/orion-demo-video-delivery.md)
