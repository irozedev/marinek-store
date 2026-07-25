/**
 * Telegram Bot API — видача одноразових інвайтів у приватні канали.
 *
 * Бот має бути адміністратором каналу з правом «Запрошувати користувачів
 * за посиланням», інакше createChatInviteLink поверне 400.
 *
 * member_limit і creates_join_request взаємовиключні. Беремо member_limit: 1 —
 * посилання вмирає після першого входу, тож переслати його подрузі не вийде.
 * Це строгіше за «Заявки на вступ», які були раніше, і не потребує ручної
 * модерації з боку Марини.
 */

const API = 'https://api.telegram.org';

type InviteLink = {
  invite_link: string;
  expire_date?: number;
  member_limit?: number;
};

async function callBot<T>(method: string, payload: unknown): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN не заданий');

  const res = await fetch(`${API}/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
  if (!data.ok) {
    throw new Error(`Telegram ${method}: ${data.description ?? res.status}`);
  }
  return data.result as T;
}

/** Створює персональне посилання на одне використання. */
export async function createSingleUseInvite(
  chatId: string,
  { name, expiresInDays = 7 }: { name: string; expiresInDays?: number },
): Promise<{ link: string; expiresAt: Date }> {
  const expireDate = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;

  const result = await callBot<InviteLink>('createChatInviteLink', {
    chat_id: chatId,
    // Видно тільки адміністраторам каналу — зручно зіставляти з замовленням.
    name: name.slice(0, 32),
    expire_date: expireDate,
    member_limit: 1,
  });

  return { link: result.invite_link, expiresAt: new Date(expireDate * 1000) };
}

/** Гасить старе посилання — потрібно при перевипуску з адмінки. */
export async function revokeInvite(chatId: string, link: string): Promise<void> {
  await callBot('revokeChatInviteLink', { chat_id: chatId, invite_link: link });
}

/**
 * З https://t.me/+HASH дістає HASH, щоб зібрати tg://join?invite=HASH.
 * Пряма схема tg:// відкриває застосунок навіть тоді, коли домен t.me
 * недоступний (а він уже блокувався в липні 2026).
 */
export function inviteHash(link: string): string | null {
  const match = link.match(/^https:\/\/t\.me\/\+([A-Za-z0-9_-]+)$/);
  return match ? match[1] : null;
}
