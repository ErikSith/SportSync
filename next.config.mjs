/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['react-leaflet', 'leaflet', 'leaflet.markercluster'],
  // Cloudflare quick tunnel (trycloudflare.com) — JS/CSS z /_next/* na mobile
  allowedDevOrigins: ['*.trycloudflare.com'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'pg', 'sharp', 'cheerio'],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        child_process: false,
      };
    }

    if (isServer && nextRuntime === 'edge') {
      const edgeExternals = [
        'pg',
        'pg-native',
        'pg-connection-string',
        'pgpass',
        'sharp',
        '@prisma/client',
        'prisma',
        'crypto',
        'cheerio',
        '@google/generative-ai',
      ];
      if (Array.isArray(config.externals)) {
        config.externals.push(...edgeExternals);
      } else if (config.externals) {
        config.externals = [config.externals, ...edgeExternals];
      } else {
        config.externals = edgeExternals;
      }
    }

    return config;
  },
};

export default nextConfig;
