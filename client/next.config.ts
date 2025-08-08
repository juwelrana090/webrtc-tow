import type { NextConfig } from "next";
const NEXT_PUBLIC_SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SOCKET_URL,
  },
  /* config options here */
};

export default nextConfig;
