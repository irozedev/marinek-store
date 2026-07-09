const MARQUEE_ITEMS = ['Без голодувань', 'Харчування', 'Сон', 'Рух', 'Вода'];

export function Marquee() {
  const strip = (
    <div
      className="flex gap-7 whitespace-nowrap pr-7 font-display text-[12px] font-semibold uppercase tracking-[.1em] text-lime"
      aria-hidden="true"
    >
      {MARQUEE_ITEMS.map((item) => (
        <span key={item} className="flex gap-7">
          <span>{item}</span>
          <span className="text-magenta">✦</span>
        </span>
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden bg-ink py-3">
      <div className="flex w-max animate-marquee will-change-transform">
        {/* Контент продубльований 4× для безшовного циклу (translateX 0 → -50%) */}
        {strip}
        {strip}
        {strip}
        {strip}
      </div>
    </div>
  );
}

const BENEFITS = [
  {
    num: '01',
    title: 'Без голодувань',
    text: 'Помірний дефіцит калорій і достатньо білка — худнеш без зривів',
  },
  {
    num: '02',
    title: '3 Zoom-зустрічі',
    text: 'Наживо з експертом, з відповідями на всі питання',
  },
  {
    num: '03',
    title: 'План на місяць',
    text: 'Щоб результат не зник одразу після марафону',
  },
];

export function Benefits() {
  return (
    <section className="flex flex-col gap-3.5 px-5 pb-2 pt-9 md:grid md:grid-cols-3 md:items-stretch">
      {BENEFITS.map((b) => (
        <div
          key={b.num}
          className="flex items-start gap-4 rounded-22 border-2 border-pinkBorder bg-white p-5 shadow-cardSoft"
        >
          <div className="flex h-12 w-12 flex-none items-center justify-center rounded-16 bg-[linear-gradient(135deg,#E93CB0,#8A2BE2)] font-display text-[18px] font-black text-white">
            {b.num}
          </div>
          <div className="flex flex-col gap-1">
            <div className="font-display text-[15px] font-bold text-ink">{b.title}</div>
            <div className="text-[14px] leading-[1.5] text-textBody">{b.text}</div>
          </div>
        </div>
      ))}
    </section>
  );
}

export function Included() {
  return (
    <section className="p-[36px_20px]">
      <div className="relative overflow-hidden rounded-28 bg-[linear-gradient(150deg,#2A0B38_0%,#4A0E5C_100%)] px-6 py-7">
        <div className="absolute -right-[60px] -top-[60px] h-[200px] w-[200px] rounded-full bg-magenta/35 blur-[50px]" />
        <h2 className="relative m-0 mb-3 font-display text-[22px] font-bold text-white">
          Що входить у марафон
        </h2>
        <p className="relative m-0 mb-[22px] text-[15px] leading-[1.55] text-white/85">
          21 день, 7 тренувань у власному темпі та 3 Zoom-зустрічі з експертом. Харчування, сон, рух
          і вода — разом, а не окремо.
        </p>
        <div className="relative grid grid-cols-2 gap-2.5">
          <div className="rounded-18 border border-white/15 bg-white/[.08] p-4">
            <div className="font-display text-[26px] font-black text-lime">21</div>
            <div className="text-[13px] font-semibold text-white/80">день програми</div>
          </div>
          <div className="rounded-18 border border-white/15 bg-white/[.08] p-4">
            <div className="font-display text-[26px] font-black text-lime">7</div>
            <div className="text-[13px] font-semibold text-white/80">тренувань</div>
          </div>
          <div className="col-span-full flex items-center gap-3.5 rounded-18 border border-white/15 bg-white/[.08] p-4">
            <div className="font-display text-[26px] font-black text-lime">3</div>
            <div className="text-[13px] font-semibold text-white/80">
              Zoom-зустрічі з експертом наживо
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PROGRAM = [
  {
    week: 'Тиждень 1',
    title: 'Фундамент',
    topics: [
      'Чому ваги брешуть',
      'Чіт-міли без відкату',
      'Вода, калорії, білок',
      'Техніка руху без травм',
      'Сон і схуднення',
      'Алкоголь і вага',
    ],
  },
  {
    week: 'Тиждень 2',
    title: 'Тіло і звички',
    topics: [
      'Чесна швидкість схуднення',
      'Живіт, що випирає',
      'Чому локального жироспалювання не існує',
      'Стрес і вага',
      'Чому виникають зриви',
      'Ревізія прогресу',
    ],
  },
  {
    week: 'Тиждень 3',
    title: 'Стійкість',
    topics: [
      '10 найпоширеніших помилок',
      'Розтяжка й безпека',
      'Плато на 21-й день',
      'Фінал: підсумки і план на місяць наперед',
    ],
  },
];

export function Program() {
  return (
    <section className="px-5 pb-5 pt-1">
      <h2 className="m-0 mb-5 text-center font-display text-[24px] font-black text-ink">
        Програма <span className="text-magenta">марафону</span>
      </h2>

      <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:items-stretch">
        {PROGRAM.map((w) => (
          <div
            key={w.week}
            className="rounded-24 border-2 border-pinkBorder bg-white p-[22px] shadow-cardSoft"
          >
            <div className="mb-3 inline-block rounded-pill bg-[linear-gradient(90deg,#E93CB0,#8A2BE2)] px-3.5 py-[7px] font-display text-[12px] font-bold text-white">
              {w.week}
            </div>
            <div className="mb-3 font-display text-[17px] font-bold text-ink">{w.title}</div>
            <div className="flex flex-wrap gap-2">
              {w.topics.map((t) => (
                <span
                  key={t}
                  className="rounded-[12px] bg-pinkChip px-[13px] py-2 text-[13px] font-semibold text-chipLegal"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
