import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  resolve: {
    alias: {
      "@ganapp/shared": path.resolve(__dirname, "../../packages/shared"),
    },
    dedupe: ['react', 'react-dom'],
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
  },
  build: {
    sourcemap: true, // Enable source maps for better error tracking
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/, /packages\/shared/],
    },
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'react', 'react-dom', 'react-router-dom'],
    force: true,
    esbuildOptions: {
      resolveExtensions: ['.ts', '.js', '.tsx', '.jsx'],
    },
  },
  ssr: {
    noExternal: ['@ganapp/shared'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
});
