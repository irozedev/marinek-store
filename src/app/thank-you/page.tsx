import type { Metadata } from 'next';
import ThankYouCard from '@/components/ThankYouCard';

export const metadata: Metadata = {
  title: 'Оплата пройшла — Марафон схуднення',
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return <ThankYouCard />;
}
