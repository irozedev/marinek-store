import type { Config } from '@netlify/functions';
import { randomBytes } from 'node:crypto';
import { db } from '../lib/db';
import { CURRENCY, PLANS, isPlanId } from '../lib/plans';
import { buildPurchaseFields } from '../lib/wayforpay';

/**
 * Створює замовлення й повертає підписані поля для форми WayForPay.
 *
 * Ціна береться з серверного прайсу (netlify/lib/plans.ts), а не з тіла
 * запиту — інакше можна було б надіслати {plan:'personal', amount:1}
 * і купити найдорожчий пакет за одиницю валюти.
 */

const WAYFORPAY_PAY_URL = 'https://secure.wayforpay.com/pay';

function siteUrl(req: Request): string {
  // Для локальної відладки serviceUrl має вказувати на тунель — WayForPay
  // не достукається до localhost. Тому дозволяємо явний override.
  return process.env.PUBLIC_SITE_URL || new URL(req.url).origin;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  let plan: unknown;
  try {
    ({ plan } = (await req.json()) as { plan?: unknown });
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  if (!isPlanId(plan)) {
    return json({ error: 'unknown_plan' }, 400);
  }

  const config = PLANS[plan];
  const base = siteUrl(req);
  const orderReference = `MX-${Date.now()}-${randomBytes(4).toString('hex')}`;

  const { data: order, error } = await db()
    .from('orders')
    .insert({
      order_reference: orderReference,
      plan: config.id,
      amount: config.price,
      currency: CURRENCY,
      status: 'pending',
    })
    .select('access_token')
    .single();

  if (error || !order) {
    console.error('create-payment: не вдалося створити замовлення', error);
    return json({ error: 'db_error' }, 500);
  }

  const fields = buildPurchaseFields({
    merchantAccount: requireEnv('WFP_MERCHANT_ACCOUNT'),
    merchantDomainName: requireEnv('WFP_MERCHANT_DOMAIN'),
    orderReference,
    orderDate: Math.floor(Date.now() / 1000),
    amount: config.price,
    currency: CURRENCY,
    productName: [config.productName],
    productCount: [1],
    productPrice: [config.price],
    serviceUrl: `${base}/api/wayforpay-callback`,
    // Токен, а не план: /thank-you більше не вірить query-параметру на слово.
    returnUrl: `${base}/thank-you?t=${order.access_token}`,
  });

  return json({ action: WAYFORPAY_PAY_URL, fields });
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} не заданий`);
  return value;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export const config: Config = { path: '/api/create-payment' };
