import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Netlify sets NETLIFY=true during builds. Keep the existing Vinext build
  // unchanged while producing a portable static site for Netlify.
  ...(process.env.NETLIFY === "true"
    ? {
        output: "export",
        typescript: { tsconfigPath: "tsconfig.netlify.json" },
      }
    : {}),
};

export default nextConfig;
