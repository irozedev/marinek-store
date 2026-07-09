import Link from 'next/link';

const NAV = [
  { href: '/oferta', label: 'Оферта' },
  { href: '/privacy', label: 'Конфіденційність' },
  { href: '/rules', label: 'Правила' },
];

type Props = {
  active: '/oferta' | '/privacy' | '/rules';
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export default function LegalLayout({ active, title, subtitle, children }: Props) {
  return (
    <div className="flex min-h-screen justify-center bg-page">
      <div className="w-full max-w-[760px] bg-page">
        <header className="flex items-center justify-between gap-3 bg-ink px-[22px] py-4">
          <Link href="/" className="text-[13px] font-bold text-lime">
            ← На головну
          </Link>
          <div className="font-display text-[12px] font-bold uppercase tracking-[.08em] text-white">
            Марафон<span className="text-lime">.</span>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 px-[22px] pt-4">
          {NAV.map((item) =>
            item.href === active ? (
              <span
                key={item.href}
                className="rounded-pill bg-ink px-3.5 py-2 text-[13px] font-bold text-lime"
              >
                {item.label}
              </span>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-pill bg-pinkChip px-3.5 py-2 text-[13px] font-semibold text-chipLegal"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        <article className="legal-article px-[22px] pb-[60px] pt-[30px]">
          <h1 className="m-0 mb-1.5 font-display text-[22px] font-black leading-[1.25] text-ink">
            {title}
          </h1>
          <p className="text-[13px] text-muted">{subtitle}</p>
          {children}
          <p className="mt-8">
            <Link href="/" className="font-extrabold text-magentaDeep hover:text-chipLegal">
              ← Повернутись на головну
            </Link>
          </p>
        </article>
      </div>
    </div>
  );
}
