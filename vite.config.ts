import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

/**
 * En développement, `/site-vitrine/*` sert `vitrine.html` — le même aiguillage
 * que `vercel.json` en production. Sans lui, le serveur de dev renverrait
 * `index.html`, donc la plateforme.
 */
const siteVitrineEnDev = (): Plugin => ({
  name: "site-vitrine-en-dev",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && /^\/site-vitrine(\/|\?|$)/.test(req.url)) req.url = "/vitrine.html";
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), siteVitrineEnDev()],
  build: {
    rollupOptions: {
      // Deux applications, deux portes d'entrée : la plateforme (et les
      // tunnels), et le site vitrine du domaine principal.
      input: {
        main: path.resolve(__dirname, "index.html"),
        vitrine: path.resolve(__dirname, "vitrine.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
