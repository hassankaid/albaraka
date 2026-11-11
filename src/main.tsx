import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { rechargerUneFois } from "./lib/lazyPage";

// Les pages sont chargées à la demande (fichiers nommés par version). Après une
// mise en ligne, un onglet resté ouvert peut réclamer un fichier qui n'existe
// plus : on recharge alors la page une fois (voir src/lib/lazyPage.tsx).
window.addEventListener("vite:preloadError", (event) => {
  if (rechargerUneFois()) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
