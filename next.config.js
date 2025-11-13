/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'uhdvxoqvtdimtufaxsya.supabase.co',
      // เพิ่ม domain อื่นๆ ที่ต้องการ
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
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Also disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  // 👇 เปลี่ยนตรงนี้
  serverExternalPackages: ['playwright'],
  // เพิ่มการตั้งค่าสำหรับ Playwright ใน serverless environment
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'playwright': 'commonjs playwright',
      });
    }
    
    // แก้ไขปัญหา binary dependencies สำหรับ Vercel
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    return config;
  },
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
