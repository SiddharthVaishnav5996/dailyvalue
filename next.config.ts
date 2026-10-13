import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * next/image refuses to load a remote image unless its host is listed
     * here. That is a security feature, not an inconvenience: without it,
     * anyone could point your image optimizer at any URL on the internet and
     * make your server fetch it.
     *
     * Two remote hosts, both read-only image CDNs:
     *
     * Pexels is the only remote host - generic photography for items the AI
     * invented and nothing else covers. Everything else is a local file under
     * /public, including the branded packshots: Open Food Facts was linked
     * directly at first and every card came back 504, because Next fetches a
     * remote image server-side with a seven second budget and their CDN does
     * not answer that in time. scripts/seed-brand-photos.mjs downloads them
     * instead.
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
