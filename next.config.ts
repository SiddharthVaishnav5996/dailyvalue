import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * next/image refuses to load a remote image unless its host is listed
     * here. That is a security feature, not an inconvenience: without it,
     * anyone could point your image optimizer at any URL on the internet and
     * make your server fetch it.
     *
     * Pexels is the only remote host we use - product photos for items the AI
     * generated. Everything else is a local file under /public.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.pexels.com",
        pathname: "/photos/**",
      },
    ],
  },
};

export default nextConfig;
