import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Les pages sont chargées à la demande (fichiers nommés par version). Après une
// mise en ligne, un onglet resté ouvert peut réclamer un fichier qui n'existe
// plus : on recharge alors la page une fois pour récupérer la nouvelle version.
window.addEventListener("vite:preloadError", (event) => {
  try {
    const cle = "alb_rechargement_version";
    const dernier = Number(sessionStorage.getItem(cle) || 0);
    if (Date.now() - dernier < 10_000) return; // déjà tenté : on n'insiste pas
    sessionStorage.setItem(cle, String(Date.now()));
  } catch {
    // stockage indisponible : on recharge quand même
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(<App />);
