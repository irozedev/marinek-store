/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Статичний export не має сервера оптимізації зображень.
  // Усі фото попередньо стиснуті у WebP (public/images), тому unoptimized безпечний.
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
