// Studio vidéo : extrait de lucide (licence ISC) les icônes du motion design Hyperframes
// et les écrit dans studio/hf/icones.json, sous leur nom français.
//
//   node scripts/studio-icones.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ICONES = {
  argent: "banknote", pieces: "coins", portefeuille: "wallet", tirelire: "piggy-bank", carte_bancaire: "credit-card",
  euro: "euro", main_argent: "hand-coins", facture: "receipt", banque: "landmark", horloge: "clock",
  sablier: "hourglass", calendrier: "calendar", reveil: "alarm-clock", chrono: "timer", ordinateur: "laptop",
  telephone: "smartphone", appel: "phone", message: "message-circle", email: "mail", porte_voix: "megaphone",
  camera: "camera", video: "video", travail: "briefcase", entreprise: "building-2", boutique: "store",
  panier: "shopping-cart", maison: "house", avion: "plane", lieu: "map-pin", monde: "globe",
  trophee: "trophy", etoile: "star", fusee: "rocket", hausse: "trending-up", baisse: "trending-down",
  graphique: "chart-line", cible: "target", couronne: "crown", diamant: "gem", eclair: "zap",
  flamme: "flame", famille: "users", coeur: "heart", bebe: "baby", main_tendue: "hand-helping",
  main_coeur: "hand-heart", poignee_de_main: "handshake", sourire: "smile", triste: "frown", lune: "moon",
  soleil: "sun", lever_soleil: "sunrise", etincelles: "sparkles", pluie: "cloud-rain", parapluie: "umbrella",
  glace: "ice-cream-cone", neige: "snowflake", montagne: "mountain", arbre: "tree-pine", sport: "dumbbell",
  sante: "activity", livre: "book-open", diplome: "graduation-cap", idee: "lightbulb", cerveau: "brain",
  alerte: "triangle-alert", interdit: "ban", croix: "x", coche: "check", cadenas: "lock",
  bouclier: "shield-check", cle: "key", balance: "scale", cadeau: "gift", voiture: "car",
  camion: "truck", ambulance: "ambulance", carton: "package", marteau: "hammer", outil: "wrench",
  repas: "utensils", cafe: "coffee", pas: "footprints", repetition: "repeat", infini: "infinity",
};

const dossier = "node_modules/lucide-react/dist/esm/icons";
const sortie = {};
for (const [nom, fichier] of Object.entries(ICONES)) {
  const src = readFileSync(join(dossier, `${fichier}.js`), "utf8");
  const tableau = src.match(/createLucideIcon\("[^"]+",\s*(\[[\s\S]*?\])\);/)[1];
  // [["circle", { cx: "12", ..., key: "…" }], …] → JSON
  const json = tableau.replace(/([{,]\s*)([a-zA-Z][\w-]*)\s*:/g, '$1"$2":');
  sortie[nom] = JSON.parse(json).map(([tag, attrs]) => {
    const { key, ...reste } = attrs;
    return [tag, reste];
  });
}
writeFileSync("studio/hf/icones.json", JSON.stringify(sortie));
console.log(`${Object.keys(sortie).length} icônes écrites dans studio/hf/icones.json`);
