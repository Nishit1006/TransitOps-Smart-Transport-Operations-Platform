import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.join(__dirname),
  },
  async rewrites() {
    // Proxies browser calls to the local backend server-side, so a tunneled
    // frontend origin never has to make cross-origin/cross-site requests
    // (and the auth cookie stays same-site) — see NEXT_PUBLIC_API_URL="" in
    // .env.local, which makes apiFetch build relative /api/... paths that
    // hit this rewrite instead of an absolute localhost:5000 URL.
    return [{ source: "/api/:path*", destination: "http://localhost:5000/api/:path*" }];
  },
};

export default nextConfig;
