// Point d'entrée du site vitrine (vitrine.html). Volontairement séparé de
// src/main.tsx : rien de la plateforme n'est chargé ici.
import { createRoot } from "react-dom/client";
// Polices auto-hébergées, seulement les graisses utilisées (cahier §8.3),
// jeu latin. Aucune requête vers Google : rien à déclarer, et plus rapide.
import "@fontsource/plus-jakarta-sans/latin-400.css";
import "@fontsource/plus-jakarta-sans/latin-500.css";
import "@fontsource/plus-jakarta-sans/latin-600.css";
import "@fontsource/plus-jakarta-sans/latin-700.css";
import "@fontsource/cinzel/latin-500.css";
import "@fontsource/allura/latin-400.css";
import "./vitrine.css";
import VitrineApp from "./VitrineApp";

createRoot(document.getElementById("root")!).render(<VitrineApp />);
