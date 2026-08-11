/**
 * Сторінка після повернення з WayForPay.
 *
 * СТАТИЧНА, БЕЗ ЖОДНИХ ЗАПИТІВ. Куди саме привести людину — сюди чи на
 * /payment-failed — вирішує функція payment-return на сервері, бо тільки
 * вона бачить підписане тіло POST від WayForPay і статус замовлення в базі.
 *
 * ЧОМУ ЗАГОЛОВОК НЕ «ОПЛАТА ПРОЙШЛА». Розвести успіх і відмову вдається
 * не завжди: окремого declineUrl у WayForPay нема, підпис на поверненні
 * може не дійти, а вебхук нерідко приходить пізніше за браузер. У такому
 * «не знаємо» людина потрапляє сюди — і стверджувати їй успіх було б
 * гірше за стару помилку: вона чекатиме листа, якого не буде, і не
 * спробує оплатити ще раз. Тому текст правдивий в обох випадках і прямо
 * називає ознаку, за якою людина сама відрізнить одне від одного:
 * списалися кошти чи ні.
 *
 * Посилання на канал тут не показуємо принципово — єдиний канал видачі
 * лист. Інвайт одноразовий і живе 7 днів, а адреса сторінки легко
 * переживає власника: вкладка, історія, спільний комп'ютер.
 *
 * УВАГА: /api/get-invite лишається живим, хоч сайт його більше не кличе —
 * на нього ходить щоденний GitHub Action, який не дає Supabase заснути.
 */

const SUPPORT_EMAIL = 'marynabrianyk@gmail.com';

export default function ThankYouCard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_600px_at_50%_-100px,#4A0E5C_0%,#1B0724_60%)] p-5">
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-28 bg-[linear-gradient(160deg,#C915A0_0%,#E93CB0_50%,#8A2BE2_100%)] px-[26px] py-10 text-center">
        <div className="absolute -left-[50px] -top-[50px] h-[180px] w-[180px] rounded-full bg-lime/30 blur-[50px]" />

        <h1 className="relative m-0 mb-3 font-display text-[26px] font-black leading-[1.2] text-white">
          Дякуємо за замовлення! 🎉
        </h1>

        <p className="relative m-0 mb-6 text-[15px] leading-[1.5] text-white/90">
          Якщо оплата пройшла — персональне посилання на канал уже надіслане на вашу пошту. Воно
          одноразове, працює тільки для вас і діє 7 днів.
        </p>

        <div className="relative rounded-2xl bg-black/20 p-4 text-left">
          <p className="m-0 mb-3 text-[13.5px] leading-[1.5] text-white/85">
            <span className="font-bold text-lime">Листа немає за кілька хвилин?</span> Перевірте
            папку «Спам». Якщо він не знайшовся — напишіть на{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="font-bold text-lime underline">
              {SUPPORT_EMAIL}
            </a>
            , відкриємо доступ вручну.
          </p>
          <p className="m-0 text-[13.5px] leading-[1.5] text-white/85">
            <span className="font-bold text-lime">Кошти з картки не списалися?</span> Тоді оплата не
            завершилась — спробуйте ще раз, гроші не втрачені.
          </p>
        </div>

        <a
          href="/#tariffs"
          className="relative mt-6 inline-block rounded-pill bg-lime px-8 py-[16px] font-display text-[15px] font-bold text-ink shadow-[0_10px_26px_rgba(27,7,36,.35)]"
        >
          Спробувати ще раз
        </a>

        <a
          href="/"
          className="relative mt-5 block text-[13.5px] font-bold text-white/70 underline"
        >
          Повернутися на сайт
        </a>
      </div>
    </div>
  );
}
