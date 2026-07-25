import { Resend } from 'resend';

/**
 * Лист із посиланням — страховка на випадок, коли жінка закрила вкладку
 * /thank-you або в неї не встановлений Telegram і tg:// нічого не відкрив.
 * Без листа єдиний доступ до інвайта живе в одній вкладці браузера.
 *
 * E-mail беремо з вебхука WayForPay (вона вводить його на сторінці оплати),
 * тож власну форму збору контактів будувати не треба.
 */

const FROM = process.env.RESEND_FROM || 'Marina K <no-reply@marinek.store>';

export async function sendInviteEmail({
  to,
  planTitle,
  inviteLink,
  expiresAt,
}: {
  to: string;
  planTitle: string;
  inviteLink: string;
  expiresAt: Date;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY не заданий');

  const until = expiresAt.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: 'long',
  });

  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1B0724">
      <h1 style="font-size:22px;margin:0 0 12px">Оплата пройшла 🎉</h1>
      <p style="margin:0 0 18px;line-height:1.5">
        Пакет: <strong>${escapeHtml(planTitle)}</strong>
      </p>
      <p style="margin:0 0 18px;line-height:1.5">
        Ось ваше персональне посилання на закритий канал. Воно
        <strong>одноразове</strong> — працює тільки для вас і діє до ${until}.
      </p>
      <p style="margin:0 0 24px">
        <a href="${inviteLink}" style="display:inline-block;background:#C915A0;color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:bold">
          Приєднатися до каналу
        </a>
      </p>
      <p style="margin:0 0 8px;line-height:1.5;font-size:14px;color:#6b5b73">
        Якщо кнопка не спрацювала — скопіюйте посилання та вставте його
        в застосунок Telegram:
      </p>
      <p style="margin:0 0 24px;word-break:break-all;font-size:14px">
        <a href="${inviteLink}" style="color:#C915A0">${escapeHtml(inviteLink)}</a>
      </p>
      <p style="margin:0;font-size:13px;color:#6b5b73">
        Не переходьте за посиланням з чужого акаунта — воно спрацює лише один раз.
      </p>
    </div>
  `;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Ваше посилання на закритий канал',
    html,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
