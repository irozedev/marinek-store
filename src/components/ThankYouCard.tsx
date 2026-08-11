/**
 * Сторінка після оплати.
 *
 * СТАТИЧНА, БЕЗ ЖОДНИХ ЗАПИТІВ — і це свідоме рішення, а не спрощення заради
 * спрощення. WayForPay не доносить сюди токен замовлення: три різні підходи
 * до returnUrl перевірені живими платежами, і жоден не спрацював (див.
 * CLAUDE.md, розділ «Грабли»). Без токена сторінка не може знати ні статусу,
 * ні пошти, ні чи видано доступ — тож опитування /api/get-invite, стани
 * «оплата не пройшла» / «кошти повернені» і картка «замовлення не знайдено»
 * були кодом, який у справжньому потоці не виконувався ніколи. Гірше: без
 * токена людина, яка щойно заплатила, бачила саме «не знайшли ваше
 * замовлення» — найгірший можливий текст у цю мить.
 *
 * Посилання на канал тут не показуємо принципово. Єдиний канал видачі —
 * лист: інвайт одноразовий і живе 7 днів, а адреса сторінки легко переживає
 * власника (вкладка, історія, спільний комп'ютер). /api/get-invite посилання
 * теж більше не віддає.
 *
 * Сторінка нічого не відкриває і не підтверджує — це просто вказівник на
 * пошту, тому нічого страшного, що її може відкрити будь-хто.
 *
 * УВАГА: /api/get-invite залишається живим, хоч сайт його більше не кличе —
 * на нього ходить щоденний GitHub Action, який не дає Supabase заснути.
 */

const SUPPORT_EMAIL = 'marynabrianyk@gmail.com';

export default function ThankYouCard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_600px_at_50%_-100px,#4A0E5C_0%,#1B0724_60%)] p-5">
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-28 bg-[linear-gradient(160deg,#C915A0_0%,#E93CB0_50%,#8A2BE2_100%)] px-[26px] py-10 text-center">
        <div className="absolute -left-[50px] -top-[50px] h-[180px] w-[180px] rounded-full bg-lime/30 blur-[50px]" />

        <h1 className="relative m-0 mb-3 font-display text-[26px] font-black leading-[1.2] text-white">
          Оплата пройшла! 🎉
        </h1>

        <p className="relative m-0 mb-6 text-[15px] leading-[1.5] text-white/90">
          Персональне посилання на канал надіслано на вашу пошту. Воно одноразове — працює тільки
          для вас.
        </p>

        <div className="relative rounded-2xl bg-black/20 p-4">
          <p className="m-0 text-[13.5px] leading-[1.5] text-white/85">
            Листа немає за кілька хвилин? Перевірте папку «Спам» — і напишіть нам на{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-lime underline">
              {SUPPORT_EMAIL}
            </a>
            , якщо він не знайшовся. Відкриємо доступ вручну.
          </p>
        </div>

        <a
          href="/"
          className="relative mt-6 inline-block text-[13.5px] font-bold text-white/70 underline"
        >
          Повернутися на сайт
        </a>
      </div>
    </div>
  );
}
