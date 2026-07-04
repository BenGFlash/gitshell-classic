import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    // samyok 06/22/2026: serverDir enables Nitro file-based server routes under server/
    // (where WebSocket handlers live); features.websocket turns on Nitro's crossws-backed
    // WebSocket support. Without serverDir, server/ routes are never scanned, so both are
    // required for out-of-the-box WebSocket support (Vercel serves it via Fluid compute).
    nitro({
      serverDir: "./server",
      features: { websocket: true },
      rollupConfig: { external: [/^@sentry\//] },
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
