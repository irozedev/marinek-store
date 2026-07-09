import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Оплата не пройшла — Марафон схуднення',
  robots: { index: false, follow: false },
};

/**
 * Сторінка неуспішної оплати (WayForPay declinedUrl → /payment-failed).
 */
export default function PaymentFailedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(1200px_600px_at_50%_-100px,#4A0E5C_0%,#1B0724_60%)] p-5">
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-28 bg-ink px-[26px] py-10 text-center shadow-pagesGlow">
        <div className="absolute -left-[50px] -top-[50px] h-[180px] w-[180px] rounded-full bg-magenta/30 blur-[50px]" />
        <h1 className="relative m-0 mb-3 font-display text-[24px] font-black leading-[1.2] text-white">
          Оплата не пройшла 😔
        </h1>
        <p className="relative m-0 mb-7 text-[15px] leading-[1.5] text-white/85">
          Кошти не списані. Таке буває через ліміти картки чи збій банку — спробуй ще раз або обери
          інший спосіб оплати (Apple Pay / Google Pay).
        </p>
        <Link
          href="/#tariffs"
          className="relative inline-block rounded-pill bg-lime px-8 py-[18px] font-display text-[15px] font-bold text-ink shadow-[0_10px_26px_rgba(27,7,36,.35)]"
        >
          Спробувати ще раз
        </Link>
      </div>
    </div>
  );
}
