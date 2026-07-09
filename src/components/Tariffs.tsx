import { PAY_LINKS, START_DATE } from '@/lib/site';

export default function Tariffs() {
  return (
    <section
      id="tariffs"
      className="bg-[linear-gradient(180deg,#FFF7FC_0%,#FDEBF7_100%)] px-5 pb-2.5 pt-[30px]"
    >
      <h2 className="m-0 mb-1.5 text-center font-display text-[24px] font-black text-ink">
        Пакети участі
      </h2>
      <p className="m-0 mb-[22px] text-center text-[14px] font-bold text-magenta">
        Старт потоку — {START_DATE}
      </p>

      <div className="flex flex-col gap-[18px] md:grid md:grid-cols-3 md:items-stretch">
        {/* Стандарт */}
        <div className="flex flex-col rounded-26 border-2 border-pinkBorder bg-white p-6 shadow-card">
          <div className="mb-3.5 flex items-baseline justify-between gap-2.5">
            <div className="font-display text-[18px] font-bold text-ink">Стандарт</div>
            <div className="font-display text-[26px] font-black text-magenta">$12</div>
          </div>
          <div className="mb-[18px] flex flex-1 flex-col gap-[9px]">
            <div className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-textLegal">
              <span className="flex-none font-extrabold text-magenta">✓</span>
              Записи 3 Zoom-зустрічей (без прямого включення)
            </div>
            <div className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-textLegal">
              <span className="flex-none font-extrabold text-magenta">✓</span>7 тренувань
            </div>
          </div>
          <a
            href={PAY_LINKS.standard}
            className="block rounded-pill border-2 border-[#F5B8DF] bg-pinkChip p-[15px] text-center font-display text-[14px] font-bold text-magentaDeep"
          >
            Обрати Стандарт
          </a>
        </div>

        {/* Чат з учасницями — найпопулярніший */}
        <div className="relative flex flex-col rounded-26 bg-[linear-gradient(160deg,#C915A0,#8A2BE2)] p-6 shadow-tariffPop">
          <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-lime px-4 py-[7px] font-display text-[11px] font-bold text-ink shadow-[0_4px_12px_rgba(27,7,36,.25)]">
            Найпопулярніший
          </div>
          <div className="mb-3.5 mt-1.5 flex items-baseline justify-between gap-2.5">
            <div className="font-display text-[18px] font-bold text-white">Чат з учасницями</div>
            <div className="font-display text-[26px] font-black text-lime">$25</div>
          </div>
          <div className="mb-[18px] flex flex-1 flex-col gap-[9px]">
            {[
              'Все зі Стандарту',
              'Закритий чат і щоденна підтримка',
              'План харчування',
              'Теми: чому вага не йде · чіт-міл · набряки · як худнути і не голодувати',
            ].map((item) => (
              <div
                key={item}
                className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-white/95"
              >
                <span className="flex-none font-extrabold text-lime">✓</span>
                {item}
              </div>
            ))}
          </div>
          <a
            href={PAY_LINKS.chat}
            className="block rounded-pill bg-lime p-4 text-center font-display text-[14px] font-bold text-ink shadow-[0_6px_18px_rgba(27,7,36,.25)]"
          >
            Обрати цей пакет
          </a>
        </div>

        {/* Персональний супровід */}
        <div className="flex flex-col rounded-26 bg-ink p-6 shadow-[0_8px_24px_rgba(27,7,36,.3)]">
          <div className="mb-3.5 flex items-baseline justify-between gap-2.5">
            <div className="font-display text-[18px] font-bold text-white">
              Персональний супровід
            </div>
            <div className="font-display text-[26px] font-black text-lime">$150</div>
          </div>
          <div className="mb-[18px] flex flex-1 flex-col gap-[9px]">
            {['Все з попередніх пакетів', 'Особиста робота з тренером'].map((item) => (
              <div
                key={item}
                className="flex items-start gap-2.5 text-[14px] leading-[1.45] text-white/90"
              >
                <span className="flex-none font-extrabold text-magenta">✓</span>
                {item}
              </div>
            ))}
          </div>
          <a
            href={PAY_LINKS.personal}
            className="block rounded-pill border-2 border-lime bg-transparent p-[15px] text-center font-display text-[14px] font-bold text-lime"
          >
            Обрати супровід
          </a>
        </div>
      </div>

      <p className="mx-1 mb-0 mt-4 text-center text-[12.5px] leading-[1.5] text-muted">
        Оплата: Visa / Mastercard · Apple Pay · Google Pay — через WayForPay. Доступ відкривається
        одразу після оплати
      </p>
    </section>
  );
}
