import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Підписи WayForPay. Усюди HMAC_MD5 на merchantSecretKey по рядку,
 * склеєному з полів через ';' (порядок полів фіксований і різний для
 * кожного типу запиту — див. константи нижче).
 *
 * Головна пастка — форматування чисел. Підпис рахується по РЯДКОВОМУ
 * представленню, тому 1200 і 1200.00 дають різні підписи. Тому суму
 * ніде не форматуємо окремо: підпис завжди рахується з того самого
 * набору рядків, який реально йде в запит (див. buildPurchaseFields).
 */

const SEP = ';';

function hmacMd5(payload: string, secret: string): string {
  return createHmac('md5', secret).update(payload, 'utf8').digest('hex');
}

/** Числа в підпис ідуть без зайвих нулів: 1200 → "1200", 1547.36 → "1547.36". */
function str(value: string | number): string {
  return typeof value === 'number' ? String(value) : value;
}

// ── Purchase (створення платежу) ────────────────────────────────────
// merchantAccount;merchantDomainName;orderReference;orderDate;amount;
// currency;productName[0..n];productCount[0..n];productPrice[0..n]

export type PurchaseInput = {
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productName: string[];
  productCount: number[];
  productPrice: number[];
  serviceUrl: string;
  returnUrl: string;
  clientEmail?: string;
  language?: string;
};

/**
 * Повертає повний набір полів для POST-форми на secure.wayforpay.com/pay,
 * включно з merchantSignature. Значення — рядки, рівно ті, що підписані.
 */
export function buildPurchaseFields(input: PurchaseInput): Record<string, string | string[]> {
  const signed = [
    input.merchantAccount,
    input.merchantDomainName,
    input.orderReference,
    str(input.orderDate),
    str(input.amount),
    input.currency,
    ...input.productName.map(str),
    ...input.productCount.map(str),
    ...input.productPrice.map(str),
  ].join(SEP);

  const fields: Record<string, string | string[]> = {
    merchantAccount: input.merchantAccount,
    merchantDomainName: input.merchantDomainName,
    merchantAuthType: 'SimpleSignature',
    merchantTransactionSecureType: 'AUTO',
    orderReference: input.orderReference,
    orderDate: str(input.orderDate),
    amount: str(input.amount),
    currency: input.currency,
    productName: input.productName,
    productCount: input.productCount.map(str),
    productPrice: input.productPrice.map(str),
    serviceUrl: input.serviceUrl,
    returnUrl: input.returnUrl,
    language: input.language ?? 'UA',
  };
  if (input.clientEmail) fields.clientEmail = input.clientEmail;

  return { ...fields, merchantSignature: hmacMd5(signed, requireSecret()) };
}

// ── Callback (вебхук на serviceUrl) ─────────────────────────────────
// merchantAccount;orderReference;amount;currency;authCode;cardPan;
// transactionStatus;reasonCode

export type WayForPayCallback = {
  merchantAccount: string;
  orderReference: string;
  amount: number | string;
  currency: string;
  authCode: string;
  cardPan: string;
  transactionStatus: string;
  reasonCode: number | string;
  merchantSignature: string;
  email?: string;
  phone?: string;
  clientName?: string;
  [key: string]: unknown;
};

/**
 * Перевіряє підпис вебхука. Порівняння timing-safe — підпис це секрет,
 * і побайтове порівняння з ранім виходом теоретично витікає інформацію.
 */
export function verifyCallbackSignature(body: WayForPayCallback): boolean {
  const expected = hmacMd5(
    [
      body.merchantAccount,
      body.orderReference,
      str(body.amount),
      body.currency,
      body.authCode ?? '',
      body.cardPan ?? '',
      body.transactionStatus,
      str(body.reasonCode ?? ''),
    ].join(SEP),
    requireSecret(),
  );

  const got = String(body.merchantSignature ?? '');
  if (got.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(got, 'utf8'), Buffer.from(expected, 'utf8'));
}

// ── Відповідь на callback ───────────────────────────────────────────
// orderReference;status;time
//
// WayForPay ретраїть вебхук до 4 діб, поки не отримає коректно підписану
// відповідь. Тому відповідати 'accept' треба навіть тоді, коли наша
// побічна логіка (Telegram, пошта) впала — інакше вебхук ходитиме днями.

export function buildCallbackResponse(orderReference: string): {
  orderReference: string;
  status: 'accept';
  time: number;
  signature: string;
} {
  const time = Math.floor(Date.now() / 1000);
  const status = 'accept' as const;
  return {
    orderReference,
    status,
    time,
    signature: hmacMd5([orderReference, status, str(time)].join(SEP), requireSecret()),
  };
}

function requireSecret(): string {
  const secret = process.env.WFP_MERCHANT_SECRET;
  if (!secret) throw new Error('WFP_MERCHANT_SECRET не заданий');
  return secret;
}
