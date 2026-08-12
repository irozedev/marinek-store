import Image from 'next/image';
import { RESULTS } from '@/lib/site';

export default function Results() {
  return (
    <section className="px-5 pb-2.5 pt-9">
      <h2 className="m-0 mb-1.5 text-center font-display text-[24px] font-black text-ink">
        Результати <span className="text-magenta">учасниць</span>
      </h2>
      <p className="m-0 mb-5 text-center text-[13.5px] text-muted">
        Фото «до / після» учасниць марафону
      </p>

      {/* Мобайл: горизонтальний scroll-snap full-bleed. ≥768 — grid 2 колонки, ≥1160 — 3 */}
      <div className="mx-results -mx-5 flex touch-pan-x snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-2 pt-1 md:m-0 md:grid md:grid-cols-2 md:gap-[18px] md:overflow-visible md:p-0 xl:grid-cols-3">
        {/* Ключ по індексу, а не по імені: імена тепер вводить Марина в
            адмінці, і двох Марій ніщо не забороняє. */}
        {RESULTS.map((r, i) => (
          <figure
            key={i}
            className="m-0 w-[84%] max-w-[400px] flex-none snap-center overflow-hidden rounded-24 border-2 border-pinkBorder bg-white shadow-card md:w-auto"
          >
            <div className="grid grid-cols-2">
              <div className="relative">
                <Image
                  src={r.before}
                  alt={`${r.name} — до`}
                  width={400}
                  height={600}
                  sizes="(min-width: 768px) 200px, 42vw"
                  className="block h-[300px] w-full object-cover"
                />
                <span className="absolute left-2.5 top-2.5 rounded-pill bg-ink/75 px-2.5 py-[5px] text-[11px] font-bold uppercase tracking-[.06em] text-white">
                  До
                </span>
              </div>
              <div className="relative">
                <Image
                  src={r.after}
                  alt={`${r.name} — після`}
                  width={400}
                  height={600}
                  sizes="(min-width: 768px) 200px, 42vw"
                  className="block h-[300px] w-full object-cover"
                />
                <span className="absolute left-2.5 top-2.5 rounded-pill bg-lime px-2.5 py-[5px] text-[11px] font-extrabold uppercase tracking-[.06em] text-ink">
                  Після
                </span>
              </div>
            </div>
            <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3.5">
              <span className="text-[15px] font-extrabold text-ink">
                {r.name} <span className="text-[13px] font-semibold text-muted">· {r.age}</span>
              </span>
              <span className="whitespace-nowrap rounded-pill bg-pinkChip px-3 py-1.5 text-[12.5px] font-semibold text-magenta">
                {r.weeks}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="m-0 mt-2.5 text-center text-[12.5px] font-semibold text-magenta md:hidden">
        Гортай убік, щоб побачити всі результати →
      </p>

      <p className="mx-1.5 mb-0 mt-3.5 text-center text-[11.5px] leading-[1.5] text-mutedFaint">
        *Результати індивідуальні та залежать від вихідних даних, дотримання програми і способу
        життя. Фото опубліковано за згодою учасниць.
      </p>
    </section>
  );
}
