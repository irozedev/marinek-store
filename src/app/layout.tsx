import type { Metadata } from 'next';
import { Unbounded, Golos_Text } from 'next/font/google';
import CookieConsent from '@/components/CookieConsent';
import { SITE_URL } from '@/lib/site';
import './globals.css';

const unbounded = Unbounded({
  subsets: ['cyrillic'],
  weight: ['400', '600', '700', '900'],
  variable: '--font-unbounded',
  display: 'swap',
});

const golos = Golos_Text({
  subsets: ['cyrillic'],
  weight: ['400', '500', '600', '800'],
  variable: '--font-golos',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Марафон схуднення для жінок — старт 27.07',
  description:
    'Ціль — навчитись худнути так, щоб результат залишився. 21 день, 7 тренувань, 3 Zoom наживо.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${unbounded.variable} ${golos.variable}`}>
      <body className="font-[family-name:var(--font-golos)]">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
