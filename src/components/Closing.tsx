import Link from 'next/link';
import { START_DATE } from '@/lib/site';

const FAQ = [
  {
    q: 'Це чергова дієта з голодуванням?',
    a: "Ні. Працюємо з помірним дефіцитом калорій і достатньою кількістю білка — без постійного голоду й втрати м'язів.",
  },
  {
    q: 'Що робити, якщо не встигаю на Zoom наживо?',
    a: 'У пакеті «Стандарт» усі 3 Zoom-зустрічі доступні в записі. У пакетах «Чат з учасницями» і «Персональний супровід» є пряме включення, але запис теж залишається — можна переглянути пізніше.',
  },
  {
    q: 'А якщо я зірвусь посеред марафону?',
    a: 'Це нормально і передбачено програмою. Показуємо, як повернутись у план без почуття провини.',
  },
  {
    q: 'Потрібне спортивне обладнання?',
    a: "Ні, тренування побудовані на вазі власного тіла. Але для кращого результату знадобляться: 2 гантелі по 1 кг, пілатесний м'ячик і резинки для фітнесу.",
  },
];

export function Faq() {
  return (
    <section className="px-5 pb-5 pt-9">
      <div className="md:mx-auto md:max-w-[700px]">
        <h2 className="m-0 mb-5 text-center font-display text-[24px] font-black text-ink">
          Питання — <span className="text-magenta">відповідь</span>
        </h2>

        <div className="flex flex-col gap-3">
          {FAQ.map((item) => (
            <details
              key={item.q}
              className="overflow-hidden rounded-20 border-2 border-pinkBorder bg-white"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3.5 px-5 py-[18px] text-[15px] font-extrabold text-ink">
                {item.q}
                <span className="faq-plus flex h-7 w-7 flex-none items-center justify-center rounded-full bg-pinkChip text-[18px] font-bold text-magenta">
                  +
                </span>
              </summary>
              <p className="m-0 px-5 pb-[18px] pt-0 text-[14px] leading-[1.55] text-textBody">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-5 pb-10 pt-4">
      <div className="relative overflow-hidden rounded-28 bg-[linear-gradient(160deg,#C915A0_0%,#E93CB0_50%,#8A2BE2_100%)] px-[26px] py-9 text-center md:mx-auto md:max-w-[700px]">
        <div className="absolute -left-[50px] -top-[50px] h-[180px] w-[180px] rounded-full bg-lime/30 blur-[50px]" />
        <h2 className="relative m-0 mb-5 font-display text-[23px] font-black leading-[1.25] text-white [text-wrap:pretty]">
          Схудни так, щоб це залишилось з тобою
        </h2>
        <a
          href="#tariffs"
          className="relative inline-block rounded-pill bg-lime px-7 py-[18px] font-display text-[15px] font-bold text-ink shadow-[0_10px_26px_rgba(27,7,36,.35)]"
        >
          Обрати пакет і почати
        </a>
        <p className="relative m-0 mt-4 text-[13px] text-white/85">Старт потоку — {START_DATE}</p>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="flex flex-col gap-4 bg-ink px-6 pb-[110px] pt-8">
      <div className="font-display text-[13px] font-bold uppercase tracking-[.08em] text-white">
        Марафон<span className="text-lime">.</span>
      </div>
      <div className="text-[13px] leading-[1.6] text-white/65">
        Оплата: Visa / Mastercard, Apple Pay, Google Pay — через WayForPay.
        <br />
        Доступ відкривається одразу після оплати.
      </div>
      <div className="text-[12px] leading-[1.7] text-white/50">
        ФОП Бряник Марина Альбертівна · РНОКПП 3676205422
        <br />
        89607, Закарпатська обл., м. Мукачево, вул. Володимира Митрополита, буд. 14, кв. 62
        <br />
        E-mail: marynabrianyk@gmail.com · Сайт: marinek.store
      </div>
      <div className="flex flex-col gap-2 text-[13px]">
        <Link href="/oferta" className="text-linkFooter">
          Публічний договір (оферта)
        </Link>
        <Link href="/privacy" className="text-linkFooter">
          Політика конфіденційності
        </Link>
        <Link href="/rules" className="text-linkFooter">
          Правила користування інформаційними послугами
        </Link>
      </div>
      <div className="border-t border-white/[.12] pt-3.5 text-[11.5px] leading-[1.6] text-white/40">
        Інформація на сайті має освітній характер і не є медичною консультацією. Перед початком
        тренувань за наявності хронічних захворювань проконсультуйтесь із лікарем. Результати
        індивідуальні й не гарантуються.
      </div>
    </footer>
  );
}

export function StickyCta() {
  return (
    <a
      href="#tariffs"
      className="fixed bottom-3 left-1/2 z-[90] flex w-max max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-3.5 rounded-pill border border-magenta/50 bg-ink/[.92] py-2 pl-5 pr-2 shadow-sticky backdrop-blur-[8px]"
    >
      <span className="whitespace-nowrap text-[13px] font-semibold text-white">
        Старт — {START_DATE}
      </span>
      <span className="whitespace-nowrap rounded-pill bg-lime px-[18px] py-3 font-display text-[13px] font-bold text-ink">
        Обрати пакет
      </span>
    </a>
  );
}
