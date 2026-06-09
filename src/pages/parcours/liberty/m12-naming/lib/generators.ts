/**
 * M12 — générateurs heuristiques de noms (port verbatim Sidali v1.2.1).
 */

export function suggestAcronyme(motsRaw: string): string[] {
  const mots = String(motsRaw || "").split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean);
  if (mots.length < 2) return [];
  const ordre = mots.slice(0, 7).map((m) => m[0].toUpperCase()).join("");
  const out = [ordre];
  if (mots.length >= 3) {
    const rev = mots.slice(0, Math.min(6, mots.length)).map((m) => m[0].toUpperCase()).reverse().join("");
    if (rev !== ordre) out.push(rev);
  }
  const fortes = ["S", "M", "R", "L", "B", "P", "C", "T"];
  for (let i = 0; i < mots.length; i++) {
    const first = mots[i][0].toUpperCase();
    if (fortes.indexOf(first) >= 0) {
      const reordered = [mots[i]].concat(mots.slice(0, i)).concat(mots.slice(i + 1)).slice(0, 6);
      const seq = reordered.map((m) => m[0].toUpperCase()).join("");
      if (out.indexOf(seq) < 0) out.push(seq);
      break;
    }
  }
  return out.slice(0, 4);
}

export function suggestMetaphore(themesRaw: string): string[] {
  const themes = String(themesRaw || "").toLowerCase();
  const out: string[] = [];
  const banks: Record<string, string[]> = {
    mouvement: ["Le Tremplin", "Le Sprint", "La Trajectoire", "L'Élan", "Le Décollage"],
    lumiere: ["RAYONNE", "Le Phare", "L'Aube", "Lumen", "Éclair"],
    nature: ["La Forge", "Le Cocon", "La Source", "La Cime", "La Voie"],
    spirituel: ["Al Baraka", "Sakina", "Noor", "Le Sentier", "La Bénédiction"],
    construction: ["La Forge", "Le Socle", "L'Atelier", "Le Chantier", "Le Pivot"],
  };
  const matched: string[] = [];
  if (/(mouvement|vitesse|sprint|élan|elan|propulsion)/.test(themes)) matched.push("mouvement");
  if (/(lumière|lumiere|éclat|eclat|rayonner|visibilité|visibilite)/.test(themes)) matched.push("lumiere");
  if (/(force|naturel|terre|racine|arbre)/.test(themes)) matched.push("nature");
  if (/(spirituel|halal|baraka|foi|barakah|béné|bene)/.test(themes)) matched.push("spirituel");
  if (/(construction|bâtir|batir|forger|atelier|fondation)/.test(themes)) matched.push("construction");
  if (matched.length === 0) matched.push("mouvement", "nature");
  matched.forEach((k) => { (banks[k] || []).slice(0, 2).forEach((s) => { if (out.indexOf(s) < 0) out.push(s); }); });
  return out.slice(0, 5);
}

export function suggestResultatMethode(upstream: any): string[] {
  const u = upstream || {};
  const headline = (u.headline_promesse || "").toLowerCase();
  const point_b = (u.point_b || "").toLowerCase();
  let result = "";
  if (/closing|closer/.test(headline + point_b)) result = "Closing";
  else if (/(mrr|chiffre d'affaires|ca |revenu)/.test(headline + point_b)) result = "Revenue";
  else if (/(reconversion|carrière|carriere)/.test(headline + point_b)) result = "Reconversion";
  else if (/(épargne|epargne|patrimoine|investissement)/.test(headline + point_b)) result = "Wealth";
  else if (/(mariage|couple)/.test(headline + point_b)) result = "Union";
  else if (/(parental|enfant|éduquer|eduquer)/.test(headline + point_b)) result = "Parental";
  else if (/(scale|croissance|grow)/.test(headline + point_b)) result = "Scale";
  else if (/(cuisine|recette)/.test(headline + point_b)) result = "Cuisine";
  else result = "Impact";
  return [result + " Mastery", result + " Engine", result + " Method", result + " Sprint", "The " + result + " Blueprint"].slice(0, 5);
}

export function suggestChiffrePromesse(unite: string, valeur: string, upstream: any): string[] {
  const v = String(valeur || "").trim();
  const u = unite || "jours";
  if (!v) return [];
  const uniteFr = ({ jours: "Jours", semaines: "Semaines", mois: "Mois" } as any)[u] || "Jours";
  const uniteEn = ({ jours: "Day", semaines: "Week", mois: "Month" } as any)[u] || "Day";
  const headline = ((upstream && upstream.headline_promesse) || "").toLowerCase();
  let theme = "Launch";
  if (/closing|closer/.test(headline)) theme = "Closer";
  else if (/scale|grow/.test(headline)) theme = "Scale";
  else if (/mariage|union/.test(headline)) theme = "Union";
  else if (/reconversion/.test(headline)) theme = "Reconversion";
  else if (/cuisine/.test(headline)) theme = "Cuisine";
  return [
    v + " " + uniteEn + (parseInt(v, 10) > 1 ? "s" : "") + " " + theme,
    "The " + v + "K " + theme,
    v + " " + uniteFr + " pour " + theme,
    theme + " en " + v + " " + u,
  ].slice(0, 4);
}

export function suggestIdentite(upstream: any): string[] {
  const u = upstream || {};
  const niche = (u.niche || "").toLowerCase();
  const out: string[] = [];
  if (/musulman|halal|baraka/.test(niche)) out.push("Al Baraka", "Halal Liberty", "Sakina", "Le Sentier");
  out.push("Liberty", "Le Cercle", "L'Académie du Faire", "Le Studio");
  out.push("L'Atelier", "Le Conclave", "Le Mouvement");
  return out.filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
}

// ─── Renommage modules / méthode ──────────────────────────────────────
const MOD_STOP_WORDS = ["trouver", "comprendre", "savoir", "identifier", "apprendre", "découvrir", "maîtriser", "traiter", "encaisser", "tester", "obtenir", "avoir", "faire", "être", "une", "des", "la", "le", "les", "de", "du", "en", "et", "à", "au", "aux", "sa", "son", "ses", "ce", "cette", "ces", "sans", "pour", "sur", "avec", "dans", "par", "vers", "depuis", "chez", "soi"];
const MOD_FEM_HINTS = ["compétence", "vente", "méthode", "identité", "stratégie", "psychologie", "technique", "culture", "offre", "promesse", "niche", "cible", "phase", "étape", "règle", "vision", "mission", "histoire", "objection", "décision", "validation", "transformation", "conversion", "acquisition", "rétention", "résonance", "garantie", "preuve", "signature", "formation"];

export function pickKeywords(text: string, n: number): string[] {
  const words = String(text || "").toLowerCase().replace(/[«»"'\(\)\[\],;:!?\.]/g, " ").split(/\s+/).filter((w) => w && w.length >= 4 && MOD_STOP_WORDS.indexOf(w) < 0);
  const out: string[] = [];
  for (const w of words) { if (out.indexOf(w) < 0) out.push(w); if (out.length >= n) break; }
  return out;
}
export function capitalize(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }
function frenchArticle(word: string): string {
  const w = String(word || "").toLowerCase();
  if (!w) return "Le";
  const startsWithVowel = /^[aeiouhéèêâàù]/.test(w);
  const isFeminine = MOD_FEM_HINTS.indexOf(w) >= 0 || /(tion|sion|té|ée|ance|ence|ique|esse|ure|ette|ière|euse|trice)$/.test(w);
  if (startsWithVowel) return "L'";
  return isFeminine ? "La" : "Le";
}
function articleNoun(word: string): string {
  const art = frenchArticle(word);
  return art === "L'" ? "L'" + capitalize(word) : art + " " + capitalize(word);
}

export function suggestModuleNames(mod: any): string[] {
  if (!mod) return [];
  const kw = pickKeywords((mod.nom || "") + " " + (mod.objectif_mesurable || ""), 4);
  const out: string[] = [];
  if (kw[0]) out.push(articleNoun(kw[0]));
  if (kw[0]) out.push(capitalize(kw[0]) + (mod.duree_video_min && mod.duree_video_min <= 30 ? " Sprint" : " Method"));
  if (kw.length >= 3) out.push((kw[0][0] + kw[1][0] + kw[2][0]).toUpperCase());
  if (kw[0]) {
    const num = mod.duree_video_min || 7;
    const unit = num <= 60 ? " min" : " jours";
    out.push(num + unit + " " + capitalize(kw[0]));
  }
  return out.filter((v, i, a) => a.indexOf(v) === i && v && v.length > 2).slice(0, 4);
}

export function suggestMethodeNames(programmeNom: string, programmeTechnique: string, upstream: any): string[] {
  if (!programmeNom || !programmeNom.trim()) return [];
  const u = upstream || {};
  const kw = pickKeywords(programmeNom + " " + (u.headline_promesse || "") + " " + (u.point_b || ""), 4);
  const nomPropre = String(programmeNom).replace(/^(Le |La |L'|Les )/i, "").trim();
  const out: string[] = [];
  out.push("La Méthode " + (nomPropre || "Propriétaire"));
  if (kw[0]) out.push(capitalize(kw[0]) + " System"); else out.push(nomPropre + " Framework");
  if (programmeTechnique === "acronyme") out.push(nomPropre.toUpperCase().replace(/[^A-Z]/g, ""));
  else if (kw.length >= 3) out.push((kw[0][0] + kw[1][0] + kw[2][0]).toUpperCase());
  out.push("Le Protocole " + (nomPropre || capitalize(kw[0] || "")));
  return out.filter((v, i, a) => a.indexOf(v) === i && v && v.length > 2).slice(0, 4);
}
