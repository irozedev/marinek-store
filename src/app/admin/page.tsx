import type { Metadata } from 'next';
import AdminApp from '@/components/admin/AdminApp';

/**
 * Кабінет Марини. Сторінка статична, як і весь сайт: усе, що вона робить,
 * відбувається в браузері напряму з Supabase під її входом.
 *
 * Чому сюди не можна зайти чужому: політики RLS виписані лише для ролі
 * `authenticated` (db/002_content.sql). Тобто саму сторінку відкрити
 * можна — але без входу вона порожня, бо база не віддає жодного рядка
 * і не приймає жодного запису. Ховати адресу сенсу немає, боронить не
 * вона, а база.
 */

export const metadata: Metadata = {
  title: 'Кабінет — marinek.store',
  // Сторінці нема чого робити в пошуку: користі нуль, а зайва увага є.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return <AdminApp />;
}
