import Image from 'next/image';
import { START_DATE } from '@/lib/site';

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(160deg,#C915A0_0%,#E93CB0_45%,#8A2BE2_100%)] md:grid md:grid-cols-[1.05fr_.95fr] md:items-stretch">
      <div className="absolute -right-20 -top-20 h-[260px] w-[260px] rounded-full bg-lime/25 blur-[60px]" />
      <div className="absolute -left-[60px] bottom-[120px] h-[200px] w-[200px] rounded-full bg-white/[.18] blur-[50px]" />

      <div className="relative flex flex-col gap-[18px] px-[22px] pt-[22px] md:justify-center md:py-11 md:pl-9 md:pr-2">
        <div className="flex items-center justify-between gap-2.5">
          <div className="font-display text-[13px] font-bold uppercase tracking-[.08em] text-white">
            Марафон<span className="text-lime">.</span>
          </div>
          <div className="rounded-pill bg-lime px-3.5 py-2 text-[13px] font-extrabold text-ink shadow-[0_4px_14px_rgba(0,0,0,.2)]">
            Старт потоку — {START_DATE}
          </div>
        </div>

        <h1 className="m-0 mt-2 font-display text-[30px] font-black leading-[1.12] text-white [text-wrap:pretty]">
          Ціль — не <span className="text-lime">«мінус 10 кг</span> за місяць»
        </h1>
        <p className="m-0 max-w-[340px] text-[17px] font-medium leading-[1.45] text-white/[.92]">
          Ціль — навчитись худнути так, щоб результат залишився
        </p>

        <a
          href="#tariffs"
          className="flex w-fit items-center justify-center gap-2.5 rounded-pill bg-lime px-6 py-[18px] font-display text-[15px] font-bold text-ink shadow-[0_8px_24px_rgba(27,7,36,.35)]"
        >
          Обрати пакет
          <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full bg-ink text-[14px] text-lime">
            ↓
          </span>
        </a>

        <div className="flex flex-wrap gap-2">
          {['21 день', '7 тренувань', '3 Zoom наживо'].map((chip) => (
            <span
              key={chip}
              className="rounded-pill border border-white/40 bg-ink/[.32] px-3 py-[7px] text-[12.5px] font-bold text-white"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="relative -mt-2 md:mt-0">
        {/* Мобайл: маска зверху. Десктоп: маска зліва, фото на всю висоту колонки */}
        <Image
          src="/images/hero-trainer.webp"
          alt="Тренерка марафону"
          width={1024}
          height={1536}
          priority
          sizes="(min-width: 1160px) 510px, (min-width: 768px) 405px, 100vw"
          className="block h-auto w-full [mask-image:linear-gradient(to_bottom,transparent_0%,black_18%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_18%)] md:h-full md:min-h-[540px] md:object-cover md:[mask-image:linear-gradient(to_right,transparent_0%,black_18%)] md:[-webkit-mask-image:linear-gradient(to_right,transparent_0%,black_18%)]"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_80%,#FFF7FC_100%)] md:hidden" />
        <div className="absolute bottom-[34px] left-[18px] animate-floaty rounded-16 bg-white/90 px-4 py-3 shadow-float backdrop-blur-[8px]">
          <div className="font-display text-[14px] font-bold text-magentaDeep">Для жінок</div>
          <div className="text-[12.5px] font-semibold text-textBody">у власному темпі, вдома</div>
        </div>
      </div>
    </section>
  );
}
