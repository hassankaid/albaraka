// Ressources de formation en fichiers (demande de Sidali, 11/10/2026) : le CEO
// dépose ses documents sur la plateforme, l'élève les télécharge d'un clic.
//
// Le fichier vit dans le stockage privé « formation-resources » ; la ressource
// garde son chemin dans `url`, préfixé « stockage: », avec le type « fichier ».
// Au clic, on crée un lien signé de quelques minutes (membres connectés seuls).
// Les ressources « lien » (et les anciens PDF/images en URL publique) restent.

export const STOCKAGE_RESSOURCES = "formation-resources";
export const PREFIXE_STOCKAGE = "stockage:";
export const TAILLE_MAX_RESSOURCE = 50 * 1024 * 1024; // 50 Mo, comme le stockage

/** Formats acceptés : extension → libellé affiché à l'élève. */
export const FORMATS_RESSOURCE: Record<string, string> = {
  pdf: "PDF",
  doc: "Word",
  docx: "Word",
  xls: "Excel",
  xlsx: "Excel",
  csv: "Excel",
  ppt: "PowerPoint",
  pptx: "PowerPoint",
  zip: "ZIP",
  png: "Image",
  jpg: "Image",
  jpeg: "Image",
  gif: "Image",
  webp: "Image",
  mp3: "Audio",
  m4a: "Audio",
  txt: "Texte",
};

/** Pour le sélecteur de fichiers. */
export const ACCEPT_RESSOURCE = Object.keys(FORMATS_RESSOURCE)
  .map((e) => `.${e}`)
  .join(",");

export function estFichierStocke(url: string | null | undefined): boolean {
  return !!url && url.startsWith(PREFIXE_STOCKAGE);
}

export function cheminStockage(url: string): string {
  return url.slice(PREFIXE_STOCKAGE.length);
}

export function extension(nom: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(nom.split("?")[0]);
  return m ? m[1].toLowerCase() : "";
}

/** « PDF », « Word »… ; « Fichier » pour un format inconnu. */
export function libelleFormat(nomOuChemin: string): string {
  return FORMATS_RESSOURCE[extension(nomOuChemin)] ?? "Fichier";
}

/** Message d'erreur à afficher, ou null si le fichier peut être déposé. */
export function verifierRessource(f: { name: string; size: number }): string | null {
  if (!FORMATS_RESSOURCE[extension(f.name)]) {
    return `« ${f.name} » : format non accepté (PDF, Word, Excel, PowerPoint, ZIP, image, audio ou texte).`;
  }
  if (f.size > TAILLE_MAX_RESSOURCE) return `« ${f.name} » dépasse 50 Mo.`;
  if (f.size === 0) return `« ${f.name} » est vide.`;
  return null;
}

/** Titre proposé à partir du nom du fichier : « Script_appel-v2.pdf » → « Script appel v2 ». */
export function titreDepuisNom(nom: string): string {
  const base = nom.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Ressource";
}

/** Nom sûr pour le chemin de stockage (sans accents, espaces ni caractères spéciaux). */
export function nomDeStockage(nom: string): string {
  const ext = extension(nom);
  const base = nom
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "ressource"}${ext ? `.${ext}` : ""}`;
}

/** Nom du fichier téléchargé par l'élève : le titre de la ressource + l'extension d'origine. */
export function nomDeTelechargement(titre: string, chemin: string): string {
  const ext = extension(chemin);
  const base = titre.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "ressource";
  return ext && !base.toLowerCase().endsWith(`.${ext}`) ? `${base}.${ext}` : base;
}

export function tailleLisible(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
