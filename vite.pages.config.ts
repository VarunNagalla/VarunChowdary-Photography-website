import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/VarunChowdary-Photography-website/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: ".output/public",
    emptyOutDir: true,
  },
});
