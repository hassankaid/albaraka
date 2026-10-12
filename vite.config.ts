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

/**
 * La plateforme est publiée sous `app.html`, PAS sous `index.html`.
 *
 * Vercel sert les fichiers qui existent AVANT d'appliquer les réécritures de
 * `vercel.json`, et `/` correspond à `index.html`. Avec un `index.html` à la
 * racine, l'accueil du domaine principal ouvrait donc la plateforme au lieu
 * du site vitrine — toutes les autres adresses étant bien aiguillées. Constaté
 * le 28/09/2026 à la bascule du DNS.
 *
 * Sans fichier à la racine, `/` passe par les règles comme n'importe quelle
 * adresse : le site vitrine sur `albarakaecosysteme.com`, `app.html` ailleurs.
 * En développement rien ne change : le serveur de Vite lit toujours
 * `index.html`, seul le fichier publié est renommé.
 */
const plateformeSousAppHtml = (): Plugin => ({
  name: "plateforme-sous-app-html",
  apply: "build",
  enforce: "post",
  generateBundle(_options, bundle) {
    const html = bundle["index.html"];
    if (!html || html.type !== "asset") {
      this.error("index.html introuvable dans le build : la plateforme ne serait plus servie.");
    }
    this.emitFile({ type: "asset", fileName: "app.html", source: html.source });
    delete bundle["index.html"];
  },
});

/**
 * Identifiant du build, publié dans /version.json et intégré au code : un onglet
 * resté ouvert sur une ancienne version le compare et propose de recharger
 * (src/components/NouvelleVersion.tsx).
 */
const BUILD_ID = (process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(36)).slice(0, 12);
const versionPubliee = (): Plugin => ({
  name: "version-publiee",
  apply: "build",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ build: BUILD_ID }) });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ command }) => ({
  define: command === "build" ? { "import.meta.env.VITE_BUILD_ID": JSON.stringify(BUILD_ID) } : {},
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), siteVitrineEnDev(), plateformeSousAppHtml(), versionPubliee()],
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
