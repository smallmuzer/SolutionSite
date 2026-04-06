import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 5173,
    hmr: { overlay: false },
    proxy: {
      "/api/events": {
        target: "http://localhost:3001",
        changeOrigin: true,
        ws: false,
        selfHandleResponse: true,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Accept", "text/event-stream");
            proxyReq.setHeader("Cache-Control", "no-cache");
            proxyReq.setHeader("Connection", "keep-alive");
          });
          proxy.on("proxyRes", (proxyRes, req, res) => {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
            res.flushHeaders?.();
            proxyRes.pipe(res);
            req.on("close", () => proxyRes.destroy());
          });
        },
      },
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    sourcemap: false,
  },
}));
