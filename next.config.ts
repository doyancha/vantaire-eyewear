import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "55321",
        pathname: "/storage/v1/object/public/product-media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "55321",
        pathname: "/storage/v1/object/public/product-media/**",
      },
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? (() => {
            try {
              const parsed = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
              return [
                {
                  protocol: parsed.protocol.replace(":", "") as "http" | "https",
                  hostname: parsed.hostname,
                  port: parsed.port || undefined,
                  pathname: "/storage/v1/object/public/product-media/**",
                },
              ];
            } catch {
              return [];
            }
          })()
        : []),
    ],
  },
};

export default nextConfig;
