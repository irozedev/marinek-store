import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-unbounded)', 'sans-serif'], // заголовки, лого, CTA, номери-бейджі
        sans: ['var(--font-golos)', 'system-ui', 'sans-serif'], // основний текст
      },
      colors: {
        ink: '#1B0724', // основний темний / фони
        plum: '#4A0E5C', // градієнти темних панелей
        plumDeep: '#2A0B38',
        magenta: '#E93CB0', // основний акцент
        magentaDeep: '#C915A0',
        violet: '#8A2BE2',
        lime: '#D4FF3F', // CTA
        page: '#FFF7FC', // фон сторінки
        pinkBorder: '#FBD8EF', // бордери карток
        pinkChip: '#FDF0F9', // фон чипів
        textBody: '#5A3B66', // основний текст на світлому
        textLegal: '#3D2547',
        muted: '#9A7BA5',
        mutedFaint: '#B79AC2',
        linkFooter: '#E98FD0',
        chipLegal: '#8A2464',
      },
      borderRadius: {
        pill: '999px',
        '28': '28px',
        '26': '26px',
        '24': '24px',
        '22': '22px',
        '20': '20px',
        '18': '18px',
        '16': '16px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(233,60,176,.1)',
        cardSoft: '0 6px 20px rgba(233,60,176,.08)',
        float: '0 10px 30px rgba(27,7,36,.25)',
        sticky: '0 12px 36px rgba(27,7,36,.5)',
        pagesGlow: '0 0 80px rgba(233,60,176,.35)',
        tariffPop: '0 14px 36px rgba(138,43,226,.35)',
      },
      screens: {
        md: '768px',
        xl: '1160px',
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        floaty: 'floaty 4s ease-in-out infinite',
        marquee: 'marquee 22s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
