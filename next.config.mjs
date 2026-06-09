/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'better-sqlite3'];
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'bcryptjs', 'nodemailer'],
  },
};

export default nextConfig;
