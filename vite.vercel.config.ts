import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: ".output/vercel",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("three")) return "three";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "router";
          if (id.includes("react")) return "react";
          return "vendor";
        },
      },
    },
  },
});
