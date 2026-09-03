import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_PATH || "/",
  resolve: {
    dedupe: ["react", "react-dom"],
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  build: {
    sourcemap: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /[\\/]node_modules[\\/](react|react-dom)([\\/]|$)/,
              priority: 20,
            },
            {
              name: "supabase",
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["@supabase/supabase-js", "react", "react-dom", "react-router-dom", "exceljs"],
    rolldownOptions: {
      resolve: {
        extensions: [".ts", ".js", ".tsx", ".jsx"],
      },
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "production"),
  },
});
