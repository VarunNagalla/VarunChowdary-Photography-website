import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(
      "https://yydbvwqvmeuusolonobp.supabase.co",
    ),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      "sb_publishable_BydtLEStKwIpDciqCxxzVQ_FYuvYp7y",
    ),
  },
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
