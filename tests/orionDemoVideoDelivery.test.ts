import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import { createDeliveryHandler } from '../api/orion-demo-video';

const path = '/api/orion-demo-video';
const origin = 'https://orion-preview.vercel.app';
const now = 1_800_000_000_000;
const sessionId = 'cs_test_SessionExample12345';
const zip = Buffer.from('UEsFBgAAAAAAAAAAAAAAAAAAAAAAAA==', 'base64');
const env = {
  VERCEL_ENV: 'preview',
  ORION_DEMO_STRIPE_KEY: 'rk_test_X',
  ORION_DEMO_STRIPE_PAYMENT_LINK_ID: 'plink_Example',
  ORION_DEMO_STRIPE_PRICE_ID: 'price_Example',
  ORION_DEMO_ZIP_BASE64: zip.toString('base64'),
  ORION_DEMO_ZIP_SHA256: createHash('sha256').update(zip).digest('hex'),
  ORION_DEMO_PUBLIC_ORIGIN: origin,
  ORION_DEMO_STRIPE_WEBHOOK_SECRET: 'whsec_ExampleSecret',
  ORION_DEMO_RESEND_KEY: 're_ExampleSecret',
  ORION_DEMO_EMAIL_FROM: 'Orion Demo Video <orders@example.com>',
};

function paidSession() {
  return {
    id: sessionId,
    object: 'checkout.session',
    livemode: false,
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    payment_link: env.ORION_DEMO_STRIPE_PAYMENT_LINK_ID,
    currency: 'usd',
    amount_subtotal: 1000,
    amount_total: 1090,
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 90 },
    line_items: {
      has_more: false,
      data: [{
        quantity: 1,
        price: { id: env.ORION_DEMO_STRIPE_PRICE_ID, currency: 'usd', unit_amount: 1000, type: 'one_time' },
      }],
    },
    payment_intent: {
      object: 'payment_intent',
      status: 'succeeded',
      amount_received: 1090,
      currency: 'usd',
      latest_charge: {
        object: 'charge',
        status: 'succeeded',
        paid: true,
        amount_captured: 1090,
        amount_refunded: 0,
        disputed: false,
        payment_method_details: { type: 'card' },
        created: now / 1000 - 10,
      },
    },
    customer_details: { email: 'buyer@example.com' },
    metadata: {},
  };
}

function downloadRequest(id = sessionId) {
  return new Request(origin + path + '?session_id=' + id + '&download=1');
}

test('Stripe checkout return offers the verified buyer the private ZIP', async () => {
  const mockFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://api.stripe.com');
    assert.equal(url.pathname, '/v1/checkout/sessions/' + sessionId);
    assert.deepEqual(url.searchParams.getAll('expand[]'), ['line_items', 'payment_intent.latest_charge']);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer ' + env.ORION_DEMO_STRIPE_KEY);
    return Response.json(paidSession());
  };
  const handle = createDeliveryHandler(env, mockFetch, () => now);
  const page = await handle(new Request(origin + path + '?session_id=' + sessionId));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Download Orion Demo Video/);
  assert.equal(page.headers.get('referrer-policy'), 'no-referrer');
  const file = await handle(downloadRequest());
  assert.equal(file.status, 200);
  assert.match(file.headers.get('cache-control') ?? '', /no-store/);
  assert.equal(file.headers.get('content-type'), 'application/zip');
  assert.equal(file.headers.get('content-disposition'), 'attachment; filename="orion-demo-video.zip"');
  assert.deepEqual(Buffer.from(await file.arrayBuffer()), zip);
});

function webhookRequest(signatureSecret = env.ORION_DEMO_STRIPE_WEBHOOK_SECRET, timestamp = now / 1000) {
  const body = JSON.stringify({
    object: 'event',
    livemode: false,
    type: 'checkout.session.completed',
    data: { object: {
      id: sessionId,
      object: 'checkout.session',
      payment_link: env.ORION_DEMO_STRIPE_PAYMENT_LINK_ID,
    } },
  });
  const signature = createHmac('sha256', signatureSecret).update(timestamp + '.' + body).digest('hex');
  return new Request(origin + path, {
    method: 'POST',
    headers: { 'Stripe-Signature': 't=' + timestamp + ',v1=' + signature },
    body,
  });
}

test('a valid Stripe webhook sends one receipt across a failed Stripe write and retries', async () => {
  let attempts = 0;
  let deliveries = 0;
  let writes = 0;
  const sent = new Map<string, string>();
  const session: ReturnType<typeof paidSession> & { metadata: Record<string, string> } = paidSession();
  const mockFetch: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.href === 'https://api.resend.com/emails') {
      attempts++;
      const headers = new Headers(init?.headers);
      const key = headers.get('Idempotency-Key') ?? '';
      assert.equal(key, 'orion-demo-video/' + sessionId);
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.to, ['buyer@example.com']);
      assert.match(body.text, new RegExp(origin + path + '\\?session_id=' + sessionId));
      assert.equal(body.attachments, undefined);
      if (!sent.has(key)) {
        deliveries++;
        sent.set(key, 'delivery-id');
      }
      return Response.json({ id: sent.get(key) });
    }
    assert.equal(url.pathname, '/v1/checkout/sessions/' + sessionId);
    if (init?.method === 'POST') {
      if (++writes === 1) return new Response(null, { status: 503 });
      const body = new URLSearchParams(String(init.body));
      assert.equal(body.get('metadata[orion_demo_video_delivery]'), 'delivery-id');
      session.metadata.orion_demo_video_delivery = 'delivery-id';
    }
    return Response.json(session);
  };
  const handle = createDeliveryHandler(env, mockFetch, () => now);
  assert.equal((await handle(webhookRequest())).status, 503);
  assert.equal((await handle(webhookRequest())).status, 204);
  assert.equal((await handle(webhookRequest())).status, 204);
  assert.equal(attempts, 2);
  assert.equal(deliveries, 1);
  assert.equal(writes, 2);
});

test('ZIP access is denied when the payment is unpaid, unrelated, discounted, refunded, disputed or expired', async () => {
  for (const [reason, change] of Object.entries({
    unpaid: (session: ReturnType<typeof paidSession>) => { session.payment_status = 'unpaid'; },
    'wrong link': (session: ReturnType<typeof paidSession>) => { session.payment_link = 'plink_Another'; },
    'wrong price': (session: ReturnType<typeof paidSession>) => { session.line_items.data[0].price.id = 'price_Another'; },
    discount: (session: ReturnType<typeof paidSession>) => { session.total_details.amount_discount = 10; },
    refund: (session: ReturnType<typeof paidSession>) => { session.payment_intent.latest_charge.amount_refunded = 1; },
    dispute: (session: ReturnType<typeof paidSession>) => { session.payment_intent.latest_charge.disputed = true; },
    expired: (session: ReturnType<typeof paidSession>) => { session.payment_intent.latest_charge.created -= 30 * 86400; },
  })) {
    const session = paidSession();
    change(session);
    const handle = createDeliveryHandler(env, async () => Response.json(session), () => now);
    const result = await handle(downloadRequest());
    assert.equal(result.status, 404, reason);
    assert.notEqual(result.headers.get('content-type'), 'application/zip', reason);
  }
});

test('the handler rejects cross-mode IDs, forged or stale Stripe signatures, and invalid ZIP configuration', async () => {
  let providerCalls = 0;
  const mockFetch: typeof fetch = async () => {
    providerCalls++;
    throw new Error('Unexpected provider access');
  };
  const handle = createDeliveryHandler(env, mockFetch, () => now);
  assert.equal((await handle(downloadRequest('cs_live_SessionExample12345'))).status, 404);
  assert.equal((await handle(webhookRequest('wrong-secret'))).status, 400);
  assert.equal((await handle(webhookRequest(env.ORION_DEMO_STRIPE_WEBHOOK_SECRET, now / 1000 - 301))).status, 400);
  const bogusZip = createDeliveryHandler({ ...env, ORION_DEMO_ZIP_SHA256: '0'.repeat(64) }, mockFetch, () => now);
  assert.equal((await bogusZip(downloadRequest())).status, 503);
  assert.equal(providerCalls, 0);
});

test('late receipt retries cannot create a send after the automatic retry window', async () => {
  const session = paidSession();
  session.payment_intent.latest_charge.created = now / 1000 - 22 * 3600;
  let providerCalls = 0;
  const handle = createDeliveryHandler(env, async (url) => {
    providerCalls++;
    assert.equal(new URL(String(url)).origin, 'https://api.stripe.com');
    return Response.json(session);
  }, () => now);
  assert.equal((await handle(webhookRequest())).status, 503);
  assert.equal(providerCalls, 1);
  assert.equal((await handle(downloadRequest())).status, 200);
});
