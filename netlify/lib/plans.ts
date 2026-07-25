/**
 * Серверний прайс. Ціна НІКОЛИ не приходить від клієнта — інакше можна
 * підмінити її в запиті й оплатити доступ за 1 одиницю валюти.
 *
 * ⚠️ Значення мають збігатися з тим, що налаштовано в кабінеті WayForPay.
 * Якщо мерчант-акаунт працює тільки в UAH — тут має бути UAH і гривнева
 * сума, а не долари з лендінгу.
 */

export const CURRENCY = process.env.WFP_CURRENCY || 'USD';

export type PlanId = 'standard' | 'chat' | 'personal';

export type Plan = {
  id: PlanId;
  /** Назва товару, що йде у WayForPay і видно в чеку. */
  productName: string;
  price: number;
  /** Який Telegram-канал відкривати. «Чат» і «Персональний» — спільний преміум. */
  channel: 'standard' | 'premium';
};

export const PLANS: Record<PlanId, Plan> = {
  standard: {
    id: 'standard',
    productName: 'Марафон схуднення — пакет «Стандарт»',
    price: 12,
    channel: 'standard',
  },
  chat: {
    id: 'chat',
    productName: 'Марафон схуднення — пакет «Чат з учасницями»',
    price: 25,
    channel: 'premium',
  },
  personal: {
    id: 'personal',
    productName: 'Марафон схуднення — пакет «Персональний супровід»',
    price: 150,
    channel: 'premium',
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && value in PLANS;
}

/** ID каналу в Telegram (вигляду -100…) для плану. */
export function channelIdForPlan(plan: Plan): string {
  const id =
    plan.channel === 'premium'
      ? process.env.TG_CHANNEL_PREMIUM_ID
      : process.env.TG_CHANNEL_STANDARD_ID;
  if (!id) throw new Error(`Не заданий ID Telegram-каналу для плану ${plan.id}`);
  return id;
}
