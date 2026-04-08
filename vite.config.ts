import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("react-dom") ||
            id.includes("react-router-dom") ||
            id.includes("@tanstack/react-query") ||
            id.includes("/react/")
          ) {
            return "vendor-react";
          }

          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }

          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }

          if (id.includes("recharts")) {
            return "vendor-charts";
          }

          if (id.includes("react-markdown")) {
            return "vendor-markdown";
          }

          return "vendor-misc";
        },
      },
    },
  },
}));
