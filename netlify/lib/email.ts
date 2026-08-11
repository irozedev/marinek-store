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

/**
 * Реквізити продавця. Мають збігатися з офертою (src/app/oferta/page.tsx) —
 * якщо там щось міняється, правити і тут.
 *
 * Потрібні не лише для годиться: у виписці по картці списання видно як
 * платіж через WayForPay, і жінка може не впізнати його за пару тижнів.
 * Лист із чітко названим продавцем знімає це питання до того, як воно
 * перетвориться на оскарження платежу в банку.
 */
const SELLER = {
  name: 'ФОП Бряник Марина Альбертівна',
  taxId: 'РНОКПП 3676205422',
  address: 'Україна, 89607, Закарпатська обл., м. Мукачево, вул. Володимира Митрополита, буд. 14, кв. 62',
  site: 'marinek.store',
  offer: 'https://marinek.store/oferta',
};

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

      <hr style="border:none;border-top:1px solid #eadff0;margin:28px 0 16px">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#9c8fa5">
        ${escapeHtml(SELLER.name)}, ${escapeHtml(SELLER.taxId)}<br>
        ${escapeHtml(SELLER.address)}<br>
        <a href="mailto:${escapeHtml(REPLY_TO)}" style="color:#9c8fa5">${escapeHtml(REPLY_TO)}</a>
        ·
        <a href="https://${escapeHtml(SELLER.site)}" style="color:#9c8fa5">${escapeHtml(SELLER.site)}</a>
        ·
        <a href="${escapeHtml(SELLER.offer)}" style="color:#9c8fa5">Умови надання послуг</a>
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
    '',
    '—',
    `${SELLER.name}, ${SELLER.taxId}`,
    SELLER.address,
    `${REPLY_TO} · ${SELLER.site}`,
    `Умови надання послуг: ${SELLER.offer}`,
  ].join('\n');

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to,
    // Тема транзакційна, а не запрошувальна. Попередня — «Ваше посилання
    // на закритий канал» — це дослівно шаблон, яким розсилають спам у
    // приватні Telegram-канали, і на живому тесті лист пішов у «Спам» на
    // iCloud. Тепер у темі те, чого спам не пише: підтвердження оплати з
    // назвою купленого пакета.
    subject: `Оплата підтверджена — ${planTitle}`,
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
