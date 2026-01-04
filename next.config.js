/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'uhdvxoqvtdimtufaxsya.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'wbvgdqiozztgqodtajui.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // แก้ไข cross-origin warning สำหรับ development
  allowedDevOrigins: [
    '192.168.1.106',
    'localhost',
    '127.0.0.1',
    '0.0.0.0'
  ],
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['playwright'],
  // เพิ่ม turbopack config เพื่อรองรับ Next.js 16
  turbopack: {},
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
