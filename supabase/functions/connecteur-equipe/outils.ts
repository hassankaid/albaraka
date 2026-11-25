// Outils MCP du connecteur « Data Al Baraka » (lecture seule).
//
// Toutes les requêtes passent par le rôle Postgres `connecteur_lecture` (aucun droit d'écriture,
// colonnes « clés » invisibles), dans une transaction READ ONLY, en protocole étendu : une seule
// commande par appel (le protocole simple laisserait passer « set transaction read write; … »).

import glossaireBrut from "./glossaire.json" with { type: "json" };

export const LIGNES_DEFAUT = 200;
export const LIGNES_MAX = 500;
const CARACTERES_MAX = 120_000;
const CELLULE_MAX = 600;

type Glossaire = {
  glossaire: { terme: string; definition: string; domaine: string }[];
  requetes_types: { question: string; reponse: string; domaine: string }[];
};
const GLOSSAIRE = glossaireBrut as Glossaire;

// deno-lint-ignore no-explicit-any
export type Sql = any;

export const INSTRUCTIONS = `Connecteur en LECTURE SEULE sur la base Postgres d'Al Baraka (CRM leads/calls, ventes et paiements, commissions, pub Meta/Snap/Google, e-mails/SMS, formations et coachings, Studio, IA).
Méthode : 1) lister_tables (avec « recherche ») et glossaire pour trouver les bonnes tables et définitions ; 2) decrire_table avant d'écrire une requête ; 3) interroger avec une requête SELECT (ou WITH).
Règles :
- Dates en UTC : pour raisonner par jour, convertir avec (colonne at time zone 'Europe/Paris').
- Montants en euros (jamais en centimes), TVA 0 % : HT = TTC.
- Une VENTE = ligne de sales dont sale_type n'est ni 'studio' ni 'acompte' (définition officielle). CA vendu : inclure les acomptes. CA encaissé : payments.status = 'paid'.
- Canal et tunnel d'un lead : leads_enriched_base (leads_enriched et calls_enriched sont vides ici : filtrées par l'utilisateur de l'appli).
- Lead « hors zone » : indicatif lisible autre que +33/+32 (voir glossaire).
- Certaines tables ont des colonnes masquées (jetons, secrets) : y nommer les colonnes, « select * » est refusé.
- ${LIGNES_MAX} lignes maximum par réponse et 10 secondes maximum par requête : agréger en SQL (count, sum, group by) plutôt que rapatrier des lignes brutes.
Les données sont réelles et personnelles (clients, prospects, élèves) : ne les recopier que si la question l'exige.`;

const lecture = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

export const OUTILS = [
  {
    name: "lister_tables",
    title: "Lister les tables",
    description: "Liste les tables et vues lisibles de la base Al Baraka avec leur nombre de lignes approximatif et leur description. Sans recherche : description courte. Avec « recherche » (mot-clé dans le nom ou la description, ex. « vente », « snap », « coaching ») : description complète des tables trouvées.",
    inputSchema: {
      type: "object",
      properties: { recherche: { type: "string", description: "Mot-clé facultatif (nom ou description)." } },
    },
    annotations: lecture,
  },
  {
    name: "decrire_table",
    title: "Décrire une table",
    description: "Décrit une table ou vue : rôle, colonnes (type, description, valeurs possibles des statuts, clés étrangères) et colonnes masquées. À appeler avant d'écrire une requête.",
    inputSchema: {
      type: "object",
      properties: { table: { type: "string", description: "Nom de la table ou vue (schéma public), ex. « leads »." } },
      required: ["table"],
    },
    annotations: lecture,
  },
  {
    name: "interroger",
    title: "Interroger la base",
    description: `Exécute UNE requête SQL en lecture (SELECT, WITH, VALUES, TABLE, EXPLAIN, SHOW) sur la base Postgres d'Al Baraka et renvoie le résultat sous forme de tableau. Lecture seule, 10 s maximum, ${LIGNES_MAX} lignes maximum (préférer les agrégats).`,
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "Une seule requête SQL en lecture, sans point-virgule final obligatoire." },
        limite: { type: "integer", description: `Nombre maximal de lignes renvoyées (défaut ${LIGNES_DEFAUT}, maximum ${LIGNES_MAX}).` },
      },
      required: ["sql"],
    },
    annotations: lecture,
  },
  {
    name: "glossaire",
    title: "Glossaire métier",
    description: "Définitions métier d'Al Baraka (vente, acompte, canal, tunnel, hors zone, fiche principale, commission, parcours…) avec la table et la colonne à utiliser, et des exemples de requêtes pour les questions fréquentes. Avec « recherche » : seulement les entrées qui contiennent ce mot.",
    inputSchema: {
      type: "object",
      properties: { recherche: { type: "string", description: "Mot-clé facultatif." } },
    },
    annotations: lecture,
  },
];

// ---------- Garde-fous SQL ----------

/** Retire commentaires et espaces de tête, puis le point-virgule final éventuel. */
export function nettoyerRequete(q: string): string {
  let s = q.trim();
  for (;;) {
    if (s.startsWith("--")) { const i = s.indexOf("\n"); s = i < 0 ? "" : s.slice(i + 1).trim(); continue; }
    if (s.startsWith("/*")) { const i = s.indexOf("*/"); s = i < 0 ? "" : s.slice(i + 2).trim(); continue; }
    break;
  }
  return s.replace(/;\s*$/, "").trim();
}

const PREMIERS_MOTS = ["select", "with", "values", "table", "explain", "show"];

/** Premier mot-clé de la requête (en sautant les parenthèses ouvrantes). */
export function premierMot(q: string): string {
  const m = /^[\s(]*([a-zA-Z]+)/.exec(q);
  return m ? m[1].toLowerCase() : "";
}

export function verifierRequete(q: string): string | null {
  if (!q) return "Requête vide.";
  if (q.length > 20_000) return "Requête trop longue (20 000 caractères maximum).";
  const mot = premierMot(q);
  if (!PREMIERS_MOTS.includes(mot)) {
    return `Seules les lectures sont acceptées (SELECT, WITH, VALUES, TABLE, EXPLAIN, SHOW) : « ${mot || "?"} » refusé.`;
  }
  return null;
}

/** Requête emballée pour limiter le nombre de lignes rapatriées. */
export function emballer(q: string, limite: number): string {
  const mot = premierMot(q);
  if (mot === "explain" || mot === "show") return q;
  return `select * from (\n${q}\n) as _resultat limit ${limite + 1}`;
}

export function aideErreur(message: string): string {
  const m = /permission denied for table (\w+)/.exec(message);
  if (m) {
    return `${message}\n→ La table « ${m[1]} » a des colonnes masquées (jetons, secrets) : « select * » est refusé, nomme les colonnes voulues (voir decrire_table('${m[1]}')). Si tu as nommé une colonne masquée, retire-la.`;
  }
  if (/permission denied for schema/.test(message)) {
    return `${message}\n→ Le connecteur ne lit que le schéma public (pas auth, storage, vault, cron).`;
  }
  if (/statement timeout/.test(message)) {
    return `${message}\n→ Requête de plus de 10 s : ajoute des filtres (dates, statut), agrège en SQL, ou évite les vues lourdes sur de longues périodes.`;
  }
  if (/read-only transaction/.test(message)) {
    return `${message}\n→ Le connecteur est en lecture seule : aucune écriture possible, même par une fonction.`;
  }
  return message;
}

// ---------- Mise en forme ----------

function cellule(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  let s: string;
  if (v instanceof Date) s = v.toISOString();
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  s = s.replace(/\s*\n\s*/g, " ⏎ ").replace(/\|/g, "\\|");
  return s.length > CELLULE_MAX ? s.slice(0, CELLULE_MAX) + "…[coupé]" : s;
}

export function enTableau(colonnes: string[], lignes: Record<string, unknown>[]): { texte: string; coupees: number } {
  const entete = `| ${colonnes.join(" | ")} |\n|${colonnes.map(() => "---").join("|")}|`;
  let texte = entete;
  let n = 0;
  for (const l of lignes) {
    const ligne = `\n| ${colonnes.map((c) => cellule(l[c])).join(" | ")} |`;
    if (texte.length + ligne.length > CARACTERES_MAX) break;
    texte += ligne;
    n++;
  }
  return { texte, coupees: lignes.length - n };
}

// ---------- Exécution ----------

async function lire(sql: Sql, q: string, params: unknown[] = []) {
  return await sql.begin("read only", async (tx: Sql) => await tx.unsafe(q, params, { simple: false }));
}

export type ResultatOutil = { texte: string; erreur?: string; lignes?: number; requete?: string };

export async function listerTables(sql: Sql, recherche?: string): Promise<ResultatOutil> {
  const rows = await lire(sql, `
    select c.relname as nom,
           case c.relkind when 'v' then 'vue' when 'm' then 'vue matérialisée' else 'table' end as genre,
           c.reltuples::bigint as lignes, coalesce(obj_description(c.oid, 'pg_class'), '') as description
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r','v','m','p')
      and (has_table_privilege(c.oid, 'SELECT') or has_any_column_privilege(c.oid, 'SELECT'))
    order by c.relname`);
  const r = (recherche ?? "").trim().toLowerCase();
  // deno-lint-ignore no-explicit-any
  const choisies = rows.filter((t: any) => !r || t.nom.toLowerCase().includes(r) || t.description.toLowerCase().includes(r));
  if (!choisies.length) return { texte: `Aucune table ne correspond à « ${recherche} ». Essaie un autre mot ou lister_tables sans recherche.`, lignes: 0 };
  // deno-lint-ignore no-explicit-any
  const texte = choisies.map((t: any) => {
    const vol = t.genre !== "table" ? t.genre : Number(t.lignes) >= 0 ? `~${Number(t.lignes).toLocaleString("fr-FR")} lignes` : "volume inconnu";
    let d = t.description;
    if (!r) { const fin = d.search(/[.;](\s|$)/); d = fin > 0 && fin < 160 ? d.slice(0, fin + 1) : d.length > 160 ? d.slice(0, 157) + "…" : d; }
    return `- ${t.nom} (${vol}) — ${d}`;
  }).join("\n");
  return { texte: `${choisies.length} table(s)${r ? ` pour « ${recherche} »` : ""} :\n${texte}`, lignes: choisies.length };
}

export async function decrireTable(sql: Sql, table: string): Promise<ResultatOutil> {
  const nom = (table ?? "").trim().replace(/^public\./, "").replace(/"/g, "");
  if (!/^[a-z_][a-z0-9_]*$/i.test(nom)) return { texte: "", erreur: `Nom de table invalide : « ${table} ».` };
  const infos = await lire(sql, `
    select c.oid, case c.relkind when 'v' then 'vue' when 'm' then 'vue matérialisée' else 'table' end as genre,
           c.reltuples::bigint as lignes, coalesce(obj_description(c.oid, 'pg_class'), '') as description,
           has_table_privilege(c.oid, 'SELECT') as tout_lisible,
           has_any_column_privilege(c.oid, 'SELECT') as lisible
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = $1 and c.relkind in ('r','v','m','p')`, [nom]);
  if (!infos.length || !infos[0].lisible) {
    return { texte: "", erreur: `Table « ${nom} » introuvable ou non lisible. Utilise lister_tables (avec « recherche ») pour trouver le bon nom.` };
  }
  const t = infos[0];
  const cols = await lire(sql, `
    select a.attname as nom, format_type(a.atttypid, a.atttypmod) as type, not a.attnotnull as nullable,
           coalesce(col_description(a.attrelid, a.attnum), '') as description,
           has_column_privilege(a.attrelid, a.attnum, 'SELECT') as lisible,
           (select cf.relname || '.' || af.attname
              from pg_constraint k
              join pg_class cf on cf.oid = k.confrelid
              join pg_attribute af on af.attrelid = k.confrelid and af.attnum = k.confkey[1]
             where k.conrelid = a.attrelid and k.contype = 'f' and k.conkey[1] = a.attnum limit 1) as cle_etrangere
    from pg_attribute a
    where a.attrelid = $1 and a.attnum > 0 and not a.attisdropped
    order by a.attnum`, [t.oid]);
  // deno-lint-ignore no-explicit-any
  const visibles = cols.filter((c: any) => c.lisible);
  // deno-lint-ignore no-explicit-any
  const masquees = cols.filter((c: any) => !c.lisible).map((c: any) => c.nom);
  const vol = t.genre !== "table" ? t.genre : Number(t.lignes) >= 0 ? `table, ~${Number(t.lignes).toLocaleString("fr-FR")} lignes` : "table, volume inconnu";
  // deno-lint-ignore no-explicit-any
  const lignes = visibles.map((c: any) =>
    `- ${c.nom} (${c.type}${c.nullable ? "" : ", obligatoire"}${c.cle_etrangere ? `, → ${c.cle_etrangere}` : ""})${c.description ? " : " + c.description : ""}`);
  let texte = `# ${nom} (${vol})\n${t.description || "(pas de description)"}\n\n## Colonnes\n${lignes.join("\n")}`;
  if (masquees.length) {
    texte += `\n\n## Colonnes masquées\n${masquees.join(", ")} : invisibles pour le connecteur. Sur cette table, « select * » est refusé : nomme les colonnes.`;
  }
  return { texte, lignes: visibles.length };
}

export async function interroger(sql: Sql, requete: string, limiteDemandee?: number): Promise<ResultatOutil> {
  const q = nettoyerRequete(requete ?? "");
  const refus = verifierRequete(q);
  if (refus) return { texte: "", erreur: refus, requete: q };
  const limite = Math.min(Math.max(1, Math.floor(Number(limiteDemandee) || LIGNES_DEFAUT)), LIGNES_MAX);
  try {
    const rows = await lire(sql, emballer(q, limite));
    const colonnes: string[] = (rows.columns ?? []).map((c: { name: string }) => c.name);
    const tropDeLignes = rows.length > limite;
    const gardees = tropDeLignes ? rows.slice(0, limite) : Array.from(rows);
    if (!gardees.length) return { texte: `0 ligne.${colonnes.length ? ` Colonnes : ${colonnes.join(", ")}.` : ""}`, lignes: 0, requete: q };
    const { texte, coupees } = enTableau(colonnes.length ? colonnes : Object.keys(gardees[0]), gardees);
    const notes: string[] = [];
    if (tropDeLignes) notes.push(`Résultat limité à ${limite} lignes (il y en a davantage) : agrège ou filtre en SQL pour tout voir.`);
    if (coupees) notes.push(`${coupees} ligne(s) non affichée(s) : réponse trop volumineuse, sélectionne moins de colonnes.`);
    return { texte: `${gardees.length - coupees} ligne(s)${notes.length ? "\n" + notes.join("\n") : ""}\n\n${texte}`, lignes: gardees.length, requete: q };
  } catch (e) {
    return { texte: "", erreur: aideErreur((e as Error).message), requete: q };
  }
}

export function glossaire(recherche?: string): ResultatOutil {
  const r = (recherche ?? "").trim().toLowerCase();
  const ok = (s: string) => !r || s.toLowerCase().includes(r);
  const termes = GLOSSAIRE.glossaire.filter((g) => ok(g.terme + " " + g.definition));
  const requetes = GLOSSAIRE.requetes_types.filter((q) => ok(q.question + " " + q.reponse));
  if (!termes.length && !requetes.length) return { texte: `Rien dans le glossaire pour « ${recherche} ». Essaie lister_tables avec cette recherche.`, lignes: 0 };
  let texte = "";
  if (termes.length) texte += `# Définitions\n${termes.map((g) => `- **${g.terme}** (${g.domaine}) : ${g.definition}`).join("\n")}`;
  if (requetes.length) texte += `${texte ? "\n\n" : ""}# Requêtes types\n${requetes.map((q) => `## ${q.question}\n${q.reponse}`).join("\n\n")}`;
  return { texte, lignes: termes.length + requetes.length };
}
