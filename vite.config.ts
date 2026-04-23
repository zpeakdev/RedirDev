import path from "node:path";
import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import manifest from "./manifest.config.ts";
import { createVitePackageInfoPlugin } from "./plugins/vitePackageInfoPlugin";

export default defineConfig({
  resolve: {
    alias: {
      "@": `${path.resolve(__dirname, "src")}`,
    },
  },
  plugins: [createVitePackageInfoPlugin(), react(), tailwindcss(), crx({ manifest })],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
});
