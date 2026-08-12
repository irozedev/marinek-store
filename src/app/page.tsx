import type { Metadata } from 'next';
import Hero from '@/components/Hero';
import { Marquee, Benefits, Included, Program } from '@/components/Sections';
import Tariffs from '@/components/Tariffs';
import Results from '@/components/Results';
import { Faq, FinalCta, Footer, StickyCta } from '@/components/Closing';
import { START_DATE, HERO_IMAGE } from '@/lib/site';

export const metadata: Metadata = {
  title: `Марафон схуднення для жінок — старт ${START_DATE}`,
  description:
    'Ціль — навчитись худнути так, щоб результат залишився. 21 день, 7 тренувань, 3 Zoom наживо. Без голодувань.',
  openGraph: {
    title: `Марафон схуднення для жінок — старт ${START_DATE}`,
    description:
      'Ціль — навчитись худнути так, щоб результат залишився. 21 день, 7 тренувань, 3 Zoom наживо.',
    url: '/',
    type: 'website',
    locale: 'uk_UA',
    // Прев'ю для месенджерів. Йде з того ж джерела, що й банер: інакше
    // Марина замінить фото на сайті, а в пересланому посиланні ще довго
    // висітиме старе, і ніхто не зрозуміє чому.
    images: [{ url: HERO_IMAGE, width: 1024, height: 1536 }],
  },
};

export default function LandingPage() {
  return (
    <div className="flex min-h-screen justify-center bg-[radial-gradient(1200px_600px_at_50%_-100px,#4A0E5C_0%,#1B0724_60%)]">
      <div className="relative w-full max-w-[480px] overflow-hidden bg-page shadow-pagesGlow md:max-w-[860px] xl:max-w-[1080px]">
        <Hero />
        <Marquee />
        <Benefits />
        <Included />
        <Program />
        <Tariffs />
        <Results />
        <Faq />
        <FinalCta />
        <Footer />
        <StickyCta />
      </div>
    </div>
  );
}
