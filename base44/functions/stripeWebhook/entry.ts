import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

async function verifySignature(payload, sigHeader, secret) {
  if (!sigHeader) return false;
  const parts = sigHeader.split(',').reduce((acc, p) => {
    const [k, v] = p.split('=');
    acc[k] = v;
    return acc;
  }, {});
  const timestamp = parts['t'];
  const v1 = parts['v1'];
  if (!timestamp || !v1) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  // tolerate clock skew up to 5 min
  const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
  if (age > 300) return false;
  return computed === v1;
}

export default async function(req) {
  try {
    const payload = await req.text();
    const sigHeader = req.headers.get('stripe-signature');
    const secret = secrets.get('STRIPE_WEBHOOK_SECRET');
    const valid = await verifySignature(payload, sigHeader, secret);
    if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 400 });

    const event = JSON.parse(payload);
    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.user_id;
      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, { is_pro: true });
        await base44.asServiceRole.entities.Subscription.create({
          user_id: userId,
          status: 'active',
          plan: 'pro_monthly',
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString()
        }).catch(() => {});
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, { is_pro: false }).catch(() => {});
        await base44.asServiceRole.entities.Subscription.updateMany({ user_id: userId, status: 'active' }, { $set: { status: 'canceled' } }).catch(() => {});
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripeWebhook error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}