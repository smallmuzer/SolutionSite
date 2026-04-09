import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    hmr: { overlay: false },
    proxy: {
      "/api": {
        target: "http://localhost:4001",
        changeOrigin: true,
        timeout: 30000,
      },
    },
  },
  plugins: [
    react(),
    {
      name: "local-assets-cache-control",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const isStatic = req.url?.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|woff|woff2)$/) || 
                           req.url?.startsWith("/assets/") || 
                           req.url?.startsWith("/node_modules/");

          if (isStatic) {
            delete req.headers["if-none-match"];
            delete req.headers["if-modified-since"];

            const originalSetHeader = res.setHeader.bind(res);
            res.setHeader = (name: string, value: any) => {
              const low = name.toLowerCase();
              if (low === "etag" || low === "last-modified") return res;
              if (low === "cache-control") value = "public, max-age=31536000, immutable";
              return originalSetHeader(name, value);
            };

            const originalWriteHead = res.writeHead.bind(res);
            res.writeHead = ((statusCode: number, ...args: any[]) => {
              res.removeHeader("ETag");
              res.removeHeader("Last-Modified");
              res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
              return originalWriteHead(statusCode, ...(args as []));
            }) as typeof res.writeHead;
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    sourcemap: false,
  },
}));
