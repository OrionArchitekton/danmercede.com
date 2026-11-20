import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const path = '/api/orion-demo-video';
const productionOrigin = 'https://www.danmercede.com';
const deliveryDays = 30;
const amount = 1000;
const receiptKey = 'orion_demo_video_delivery';
const signatureToleranceSeconds = 300;
const maxEventBytes = 128 * 1024;
// Resend remembers the key for 24 hours. Stop automatic sends before that
// window can expire, even if recording the Stripe receipt repeatedly failed.
const automaticSendSeconds = 22 * 3600;
const responseHeaders = {
  'Cache-Control': 'private, no-store',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
};

type Session = {
  id?: string;
  object?: string;
  livemode?: boolean;
  mode?: string;
  status?: string;
  payment_status?: string;
  payment_link?: string;
  currency?: string;
  amount_subtotal?: number;
  amount_total?: number;
  total_details?: { amount_discount?: number; amount_shipping?: number; amount_tax?: number };
  line_items?: {
    has_more?: boolean;
    data?: Array<{
      quantity?: number;
      price?: { id?: string; currency?: string; unit_amount?: number; type?: string };
    }>;
  };
  payment_intent?: {
    object?: string;
    status?: string;
    amount_received?: number;
    currency?: string;
    latest_charge?: {
      object?: string;
      status?: string;
      paid?: boolean;
      amount_captured?: number;
      amount_refunded?: number;
      disputed?: boolean;
      payment_method_details?: { type?: string };
      created?: number;
    };
  };
  customer_details?: { email?: string };
  metadata?: Record<string, string>;
};

function response(status: number, body: BodyInit | null = null, headers = {}) {
  return new Response(body, { status, headers: { ...responseHeaders, ...headers } });
}

function configure(env: NodeJS.ProcessEnv) {
  const live = env.VERCEL_ENV === 'production';
  const key = env.ORION_DEMO_STRIPE_KEY ?? '';
  const paymentLink = env.ORION_DEMO_STRIPE_PAYMENT_LINK_ID ?? '';
  const price = env.ORION_DEMO_STRIPE_PRICE_ID ?? '';
  const archive = env.ORION_DEMO_ZIP_BASE64 ?? '';
  const origin = live ? productionOrigin : env.ORION_DEMO_PUBLIC_ORIGIN ?? '';
  if (!new RegExp('^rk_' + (live ? 'live' : 'test') + '_[A-Za-z0-9]+$').test(key)
      || !/^plink_[A-Za-z0-9]+$/.test(paymentLink)
      || !/^price_[A-Za-z0-9]+$/.test(price)
      || (!live && !/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin))
      || archive.length > 32_768 || !/^[A-Za-z0-9+/]+={0,2}$/.test(archive)) return null;
  const zip = Buffer.from(archive, 'base64');
  if (zip.length < 22 || zip.toString('base64') !== archive
      || ![0x04034b50, 0x06054b50].includes(zip.readUInt32LE(0))
      || createHash('sha256').update(zip).digest('hex') !== env.ORION_DEMO_ZIP_SHA256) return null;

  const sessionId = new RegExp('^cs_' + (live ? 'live' : 'test') + '_[A-Za-z0-9]{12,200}$');
  return { live, key, paymentLink, price, origin, zip, sessionId };
}

type Config = NonNullable<ReturnType<typeof configure>>;

function checkoutUrl(id: string) {
  return 'https://api.stripe.com/v1/checkout/sessions/' + id;
}

function providerOptions() {
  return { redirect: 'error', signal: AbortSignal.timeout(5000) } as const;
}

async function verifyPayment(config: Config, fetcher: typeof fetch, id: string, now: number) {
  const url = new URL(checkoutUrl(id));
  url.searchParams.append('expand[]', 'line_items');
  url.searchParams.append('expand[]', 'payment_intent.latest_charge');
  const result = await fetcher(url, {
    ...providerOptions(),
    headers: { Authorization: 'Bearer ' + config.key },
  });
  if (result.status === 404) return null;
  if (!result.ok) throw new Error('stripe_lookup_failed');
  const session = await result.json() as Session;
  const tax = session?.total_details?.amount_tax;
  if (session?.id !== id || session.object !== 'checkout.session' || session.livemode !== config.live
      || session.mode !== 'payment' || session.status !== 'complete' || session.payment_status !== 'paid'
      || session.payment_link !== config.paymentLink || session.currency !== 'usd'
      || session.amount_subtotal !== amount || session.total_details?.amount_discount !== 0
      || session.total_details.amount_shipping !== 0 || typeof tax !== 'number' || !Number.isSafeInteger(tax)
      || tax < 0 || session.amount_total !== amount + tax) return null;

  const items = session.line_items;
  const intent = session.payment_intent;
  const charge = intent?.latest_charge;
  if (!Array.isArray(items?.data) || intent?.object !== 'payment_intent' || charge?.object !== 'charge') {
    throw new Error('stripe_expansion_missing');
  }
  const [item] = items.data;
  if (items.has_more !== false || items.data.length !== 1 || item?.quantity !== 1
      || item.price?.id !== config.price || item.price.currency !== 'usd'
      || item.price.unit_amount !== amount || item.price.type !== 'one_time'
      || intent.status !== 'succeeded' || intent.amount_received !== session.amount_total || intent.currency !== 'usd'
      || charge.status !== 'succeeded' || charge.paid !== true || charge.amount_captured !== session.amount_total
      || charge.amount_refunded !== 0 || charge.disputed !== false || charge.payment_method_details?.type !== 'card'
      || typeof charge.created !== 'number' || !Number.isSafeInteger(charge.created)) return null;

  const paidAge = Math.floor(now / 1000) - charge.created;
  return paidAge >= -60 && paidAge < deliveryDays * 86400 ? { session, paidAge } : null;
}

async function signedEvent(request: Request, secret: string, now: number) {
  const signature = request.headers.get('Stripe-Signature') ?? '';
  if (signature.length > 2048 || !request.body) return null;
  const parts = signature.split(',').map((part) => part.trim());
  const timestamps = parts.filter((part) => part.startsWith('t='));
  if (timestamps.length !== 1 || !/^t=[0-9]{1,12}$/.test(timestamps[0])) return null;
  const timestamp = timestamps[0].slice(2);
  if (Math.abs(Math.floor(now / 1000) - Number(timestamp)) > signatureToleranceSeconds) return null;
  const signatures = parts.filter((part) => /^v1=[0-9a-f]{64}$/.test(part));
  if (!signatures.length) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maxEventBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const payload = Buffer.concat(chunks, length);
  const digest = createHmac('sha256', secret).update(timestamp + '.').update(payload).digest();
  if (!signatures.some((part) => timingSafeEqual(digest, Buffer.from(part.slice(3), 'hex')))) return null;
  try {
    return JSON.parse(payload.toString('utf8')) as {
      object?: string;
      livemode?: boolean;
      type?: string;
      data?: { object?: { id?: string; object?: string; payment_link?: string } };
    };
  } catch {
    return null;
  }
}

async function sendReceipt(
  request: Request,
  config: Config,
  env: NodeJS.ProcessEnv,
  fetcher: typeof fetch,
  now: number,
) {
  const secret = env.ORION_DEMO_STRIPE_WEBHOOK_SECRET ?? '';
  const resendKey = env.ORION_DEMO_RESEND_KEY ?? '';
  const from = env.ORION_DEMO_EMAIL_FROM ?? '';
  if (!/^whsec_[A-Za-z0-9]+$/.test(secret) || !/^re_[A-Za-z0-9_]+$/.test(resendKey)
      || !from || /[\r\n]/.test(from)) return unavailable();

  const event = await signedEvent(request, secret, now);
  if (event?.object !== 'event' || event.livemode !== config.live) return response(400);
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return response(204);
  }
  const eventSession = event.data?.object;
  const id = eventSession?.id ?? '';
  if (eventSession?.object !== 'checkout.session' || !config.sessionId.test(id)) return response(400);
  if (eventSession.payment_link !== config.paymentLink) return response(204);
  const payment = await verifyPayment(config, fetcher, id, now);
  if (!payment || payment.session.metadata?.[receiptKey]) return response(204);

  const recipient = payment.session.customer_details?.email ?? '';
  if (!/^[^\s@,<>;]+@[^\s@,<>;]+$/.test(recipient) || payment.paidAge >= automaticSendSeconds) {
    return unavailable();
  }
  const download = new URL(path, config.origin);
  download.searchParams.set('session_id', id);
  const email = await fetcher('https://api.resend.com/emails', {
    ...providerOptions(),
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + resendKey,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'orion-demo-video/' + id,
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      subject: 'Download your Orion Demo Video ZIP',
      text: 'Your Orion Demo Video payment is confirmed. Download the ZIP within '
        + deliveryDays + ' days of purchase at ' + download.href,
    }),
  });
  if (!email.ok) return unavailable();
  const receipt: { id?: string } = await email.json();
  if (!receipt?.id || !/^[A-Za-z0-9-]{1,128}$/.test(receipt.id)) return unavailable();

  const saved = await fetcher(checkoutUrl(id), {
    ...providerOptions(),
    method: 'POST',
    headers: { Authorization: 'Bearer ' + config.key },
    body: new URLSearchParams({ ['metadata[' + receiptKey + ']']: receipt.id }),
  });
  if (!saved.ok) return unavailable();
  const updated: Session = await saved.json();
  return updated?.id === id && updated.metadata?.[receiptKey] === receipt.id ? response(204) : unavailable();
}

function unavailable() {
  return response(503, 'Download service temporarily unavailable. Please try again.');
}

export function createDeliveryHandler(
  env: NodeJS.ProcessEnv,
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
) {
  return async (request: Request) => {
    if (request.method !== 'GET' && request.method !== 'POST') {
      return response(405, null, { Allow: 'GET, POST' });
    }
    try {
      const config = configure(env);
      if (!config) return unavailable();
      if (request.method === 'POST') return await sendReceipt(request, config, env, fetcher, now());
      const query = new URL(request.url).searchParams;
      const id = query.get('session_id') ?? '';
      if (!config.sessionId.test(id) || query.getAll('session_id').length !== 1
          || !await verifyPayment(config, fetcher, id, now())) {
        return response(404, 'A verified Orion Demo Video purchase is required.');
      }
      if (query.get('download') === '1') {
        return response(200, new Uint8Array(config.zip), {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="orion-demo-video.zip"',
        });
      }
      return response(200, `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Orion Demo Video download</title>
<main><h1>Orion Demo Video</h1>
<p>Your payment is confirmed. Your download link is available for ${deliveryDays} days after purchase.</p>
<p><a href="${path}?session_id=${id}&amp;download=1">Download Orion Demo Video (ZIP)</a></p></main>
</html>`, { 'Content-Type': 'text/html; charset=utf-8' });
    } catch {
      return unavailable();
    }
  };
}

export default { fetch: createDeliveryHandler(process.env) };
