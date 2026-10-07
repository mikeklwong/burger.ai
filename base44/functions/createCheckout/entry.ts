import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const PRICE_ID = 'price_1UHbIHK6FtIs1dnUIuYHHxIb';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let userId = null;
    let email = null;
    try {
      const user = await base44.auth.me();
      if (user) { userId = user.id; email = user.email; }
    } catch (e) {}
    const body = await req.json().catch(() => ({}));
    userId = userId || body.user_id;
    email = email || body.email;
    if (!userId) return Response.json({ error: 'Login required to subscribe' }, { status: 401 });

    const params = new URLSearchParams();
    params.append('mode', 'subscription');
    params.append('line_items[0][price]', PRICE_ID);
    params.append('line_items[0][quantity]', '1');
    params.append('client_reference_id', userId);
    if (email) params.append('customer_email', email);
    params.append('metadata[user_id]', userId);
    params.append('metadata[base44_app_id]', process.env.BASE44_APP_ID || '');
    params.append('subscription_data[metadata][user_id]', userId);
    params.append('subscription_data[metadata][base44_app_id]', process.env.BASE44_APP_ID || '');
    const origin = req.headers.get('origin') || 'https://dark-rate-your-fit.base44.app';
    params.append('success_url', origin + '/pro?status=success');
    params.append('cancel_url', origin + '/pro?status=cancel');

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + secrets.get('STRIPE_SECRET_KEY'),
        'Stripe-Version': '2025-10-29.clover',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': crypto.randomUUID()
      },
      body: params
    });
    const session = await res.json();
    if (!res.ok) return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 500 });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createCheckout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}