import type { NextConfig } from "next";

const nextConfig: any = {
  serverExternalPackages: ['node-opcua'],
  // @ts-ignore
  // TAMBAHKAN '10.10.10.131' DI DALAM KURUNG SIKU INI:
  allowedDevOrigins: ['10.243.215.145', 'localhost', '127.0.0.1', '10.10.10.131', '10.10.5.15', 'Ascon Matrix.local', '10.242.215.145'],
  turbopack: {}, 
  webpack: (config: any, { dev }: { dev: boolean }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;