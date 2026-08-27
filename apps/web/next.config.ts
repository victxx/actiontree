import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@actiontree/actions",
    "@actiontree/ens",
    "@actiontree/profile",
    "@actiontree/solana",
  ],
  serverExternalPackages: ["ws", "bufferutil", "utf-8-validate"],
  turbopack: {
    resolveAlias: {
      fs: { browser: "./empty-module.js" },
      ws: { browser: "./empty-module.js" },
      bufferutil: { browser: "./empty-module.js" },
      "utf-8-validate": { browser: "./empty-module.js" },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        ws: false,
      };
      config.resolve.alias = {
        ...config.resolve.alias,
        ws: false,
        bufferutil: false,
        "utf-8-validate": false,
      };
    }
    return config;
  },
};

export default nextConfig;
