import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'zustand',
    ],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
  productionBrowserSourceMaps: false,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/admin/:path*',
        destination: '/:path*',
        permanent: false,
      },
    ];
  },
  async rewrites() {
    // Proxy Firebase Auth helper endpoints same-origin — required for Google
    // sign-in in privacy-strict browsers (Brave, Safari, strict Chrome).
    const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!project) return [];
    return [
      { source: '/__/auth/:path*',     destination: `https://${project}.firebaseapp.com/__/auth/:path*` },
      { source: '/__/firebase/:path*', destination: `https://${project}.firebaseapp.com/__/firebase/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.vercel-scripts.com *.vercel.com *.googleapis.com *.google.com *.gstatic.com *.googletagmanager.com accounts.google.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "img-src 'self' data: blob: https: firebasestorage.googleapis.com *.firebasestorage.app lh3.googleusercontent.com images.unsplash.com",
              "font-src 'self' fonts.gstatic.com",
              "connect-src 'self' *.googleapis.com *.google.com *.firebaseio.com *.firebasestorage.app *.firebaseapp.com *.googletagmanager.com *.google-analytics.com *.analytics.google.com *.vercel.com *.vercel-insights.com wss://*.firebaseio.com api.metals.dev api.stlouisfed.org",
              "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
