/**
 * Стиснення фото прямо в браузері, ДО завантаження в Supabase.
 *
 * Це не оптимізація «щоб було швидше», а умова працездатності. Марина
 * додає фото з телефона: типовий знімок — 3–5 МБ і 3000+ пікселів по
 * довгій стороні. На сайті ця картка займає 200 px і стоїть вище згину.
 * Без стиснення один такий файл важить більше, ніж уся решта сторінки.
 *
 * Сервер про це теж знає: bucket приймає лише image/webp до 1 МБ
 * (db/002_content.sql). Тобто якщо тут щось піде не так, завантаження
 * впаде з помилкою, а не пролізе на лендинг.
 */

// Картка «до/після» на сайті — 400×600 CSS-пікселів. Подвоюємо під Retina
// і на цьому зупиняємось: далі різниці на екрані вже не видно, а вага росте.
const CARD = { maxWidth: 800, maxHeight: 1200 } as const;

// Головне фото більше: воно на весь екран телефона і на пів екрана
// десктопа. 1024×1536 — розмір нинішнього банера, який важить 56 КБ.
export const HERO = { maxWidth: 1024, maxHeight: 1536 } as const;

const QUALITY = 0.82;

export const MAX_UPLOAD_BYTES = 1_048_576;

export async function compressToWebp(
  file: File,
  limits: { maxWidth: number; maxHeight: number } = CARD,
): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Це не зображення. Оберіть фото.');
  }

  const bitmap = await loadBitmap(file);
  const scale = Math.min(limits.maxWidth / bitmap.width, limits.maxHeight / bitmap.height, 1);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Не вдалося обробити фото.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ('close' in bitmap) bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', QUALITY),
  );
  if (!blob) throw new Error('Не вдалося стиснути фото.');

  // Впертися в ліміт після стиснення майже неможливо, але якщо це сталося —
  // краще сказати про це тут, ніж отримати невиразну помилку від Supabase.
  if (blob.size > MAX_UPLOAD_BYTES) {
    throw new Error('Фото завелике навіть після стиснення. Спробуйте інше.');
  }

  return blob;
}

/**
 * createImageBitmap швидший і не тримає DOM, але в Safari до 17 його немає
 * для File. Тому запасний шлях через <img> — саме Safari тут і важливий:
 * Марина працює з айфона.
 */
async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Падаємо у запасний варіант нижче.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Не вдалося прочитати фото.'));
      img.src = url;
    });
  } finally {
    // Знімок уже намальований на canvas, посилання більше не потрібне.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
