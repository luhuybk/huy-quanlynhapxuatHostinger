import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Output File Tracing can miss the Prisma query-engine binary since it's
  // loaded dynamically, not via static import/require. Without this, the
  // standalone build throws "query engine not found" at runtime on Hostinger.
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/.prisma/client/**/*",
      "./node_modules/@prisma/client/**/*",
    ],
  },
  // Version-skew guard: ties client asset requests / server-action IDs
  // to this exact build so Hostinger restarts/redeploys don't serve
  // mismatched client/server bundles ("Failed to find Server Action").
  deploymentId: process.env.DEPLOYMENT_ID,
  // Các đường dẫn cũ trước khi gom lại thành "Hàng về kho" / "Hàng cần order" —
  // giữ redirect để link/bookmark cũ không bị 404.
  async redirects() {
    return [
      { source: "/nhap-hang", destination: "/hang-ve-kho", permanent: false },
      { source: "/nhap-hang-trung", destination: "/hang-ve-kho", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        // Disable proxy buffering on Hostinger/nginx so streaming SSR works.
        source: "/:path*{/}?",
        headers: [{ key: "X-Accel-Buffering", value: "no" }],
      },
    ];
  },
};

export default nextConfig;
