import type { NextConfig } from "next";

function supabaseStorageHost(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw).hostname;
  } catch {
    return undefined;
  }
}

const host = supabaseStorageHost();

const nextConfig: NextConfig = {
  images: host
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: host,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
};

export default nextConfig;
