import { Resend } from 'resend';

/**
 * Лист із посиланням — страховка на випадок, коли жінка закрила вкладку
 * /thank-you або в неї не встановлений Telegram і tg:// нічого не відкрив.
 * Без листа єдиний доступ до інвайта живе в одній вкладці браузера.
 *
 * E-mail беремо з вебхука WayForPay (вона вводить його на сторінці оплати),
 * тож власну форму збору контактів будувати не треба.
 */

// Адреса виду no-reply@ — слабкий сигнал для спам-фільтрів і глухий кут
// для клієнтки, якщо вона просто відповість на лист. Пишемо з людської
// адреси й ставимо reply_to на реальну пошту, яку читають.
const FROM = process.env.RESEND_FROM || 'Marina K <marina@marinek.store>';
const REPLY_TO = process.env.RESEND_REPLY_TO || 'marynabrianyk@gmail.com';

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
        Якщо кнопка не спрацювала — скопіюйте це посилання та вставте його
        в застосунок Telegram:
      </p>
      <p style="margin:0 0 24px;word-break:break-all;font-size:14px;color:#1B0724">
        ${escapeHtml(inviteLink)}
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#6b5b73">
        Посилання одноразове: щойно ви за ним увійдете, для інших воно
        перестане працювати.
      </p>
      <p style="margin:0;font-size:13px;color:#6b5b73">
        Щось не спрацювало? Відповідайте прямо на цей лист або пишіть на
        <a href="mailto:${escapeHtml(REPLY_TO)}" style="color:#C915A0">${escapeHtml(REPLY_TO)}</a>
        — і ми все владнаємо.
      </p>
    </div>
  `;

  // Текстова версія обов'язкова: лист лише з HTML отримує помітно гірший
  // бал у спам-фільтрів, а домен у нас новий і репутації ще немає.
  const text = [
    'Оплата пройшла.',
    '',
    `Пакет: ${planTitle}`,
    '',
    `Ваше персональне посилання на закритий канал (діє до ${until}):`,
    inviteLink,
    '',
    'Посилання одноразове — воно спрацює тільки один раз.',
    'Якщо воно не відкривається у браузері, скопіюйте його',
    'та вставте у пошук застосунку Telegram.',
    '',
    `Щось не спрацювало? Відповідайте на цей лист або пишіть на ${REPLY_TO}.`,
  ].join('\n');

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    subject: 'Ваше посилання на закритий канал',
    html,
    text,
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
