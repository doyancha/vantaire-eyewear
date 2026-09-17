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
  async headers() {
    const supabaseOrigin = (() => {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
        } catch {
          return "";
        }
      }
      return "";
    })();

    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: https://images.unsplash.com http://127.0.0.1:55321 http://localhost:55321 ${supabaseOrigin}`.trim(),
      "font-src 'self' data:",
      `connect-src 'self' http://127.0.0.1:55321 http://localhost:55321 ${supabaseOrigin} https://api.whatsapp.com`.trim(),
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://api.whatsapp.com",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspDirectives },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};

export default nextConfig;
