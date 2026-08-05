/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@masahepinas/config',
    '@masahepinas/types',
    '@masahepinas/validation',
    '@masahepinas/utils',
    '@masahepinas/database',
    '@masahepinas/ui',
  ],
  images: {
    // Supabase Storage public bucket host is added once the project URL is known.
    remotePatterns: [],
  },
};

export default nextConfig;
