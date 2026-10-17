// URL fetching uses undici in the Node runtime; keep it out of the server bundle.
import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["undici"],
};
export default config;
