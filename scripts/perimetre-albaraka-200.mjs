// ─────────────────────────────────────────────────────────────────────────
// Construit le périmètre de la campagne « Al Baraka 200 €/mois ».
//
//   node scripts/perimetre-albaraka-200.mjs <export-systeme-io.csv> [sortie.sql]
//
// Prend l'export Systeme.io (contacts actifs, sans paiement), le normalise,
// et produit un fichier SQL qui :
//   1. dépose ces adresses dans une table de transit ;
//   2. les fusionne avec les contacts Supabase ;
//   3. retire tout ce que `emails_a_exclure_albaraka_200()` désigne ;
//   4. ordonne les destinataires du plus chaud au plus froid.
//
// La fusion et les exclusions se font en SQL, côté base : c'est là que vivent
// les ventes, les Pass, les rebonds et les conférences. Ce script ne décide
// de rien, il ne fait que préparer la matière.
//
// Le CSV contient des données personnelles : il ne doit jamais être déposé
// dans ce dépôt, qui est public. Le SQL produit non plus.
//
// L'ORDRE est le garde-fou de délivrabilité : les adresses qui ont déjà
// ouvert un mail partent en premier, les jamais contactées en dernier. Si les
// rebonds s'emballent sur les premiers lots, on coupe avant d'avoir entamé la
// partie froide — et le domaine reste propre pour les mails clients.
// ─────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [, , fichierCsv, sortieArg] = process.argv;
if (!fichierCsv) {
  console.error("usage : node scripts/perimetre-albaraka-200.mjs <export.csv> [sortie.sql]");
  process.exit(1);
}
const sortie = resolve(sortieArg ?? "perimetre-albaraka-200.sql");

// ── Lecture CSV, séparateur et colonnes devinés ──────────────────────────
const brut = readFileSync(resolve(fichierCsv), "utf-8").replace(/^﻿/, "");
const premiereLigne = brut.slice(0, brut.indexOf("\n"));
const sep = [",", ";", "\t"].sort(
  (a, b) => premiereLigne.split(b).length - premiereLigne.split(a).length,
)[0];

/** Découpe une ligne CSV en respectant les guillemets. */
function decouper(ligne) {
  const out = [];
  let cur = "", dans = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (dans && ligne[i + 1] === '"') { cur += '"'; i++; }
      else dans = !dans;
    } else if (c === sep && !dans) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const lignes = brut.split(/\r?\n/).filter((l) => l.trim() !== "");
const entetes = decouper(lignes[0]).map((h) => h.trim().toLowerCase());

const trouver = (motifs) => entetes.findIndex((h) => motifs.some((m) => h.includes(m)));
const iEmail = trouver(["email", "e-mail", "mail", "courriel"]);
const iPrenom = trouver(["first", "prénom", "prenom", "firstname"]);
if (iEmail < 0) {
  console.error(`colonne e-mail introuvable. En-têtes lus : ${entetes.join(" | ")}`);
  process.exit(1);
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const vus = new Map();
let invalides = 0;
for (const ligne of lignes.slice(1)) {
  const champs = decouper(ligne);
  const email = (champs[iEmail] ?? "").trim().toLowerCase();
  if (!EMAIL_RX.test(email)) { invalides++; continue; }
  const prenom = iPrenom >= 0 ? (champs[iPrenom] ?? "").trim() : "";
  // Première occurrence gagnante : l'export est trié, le doublon est du bruit.
  if (!vus.has(email)) vus.set(email, prenom);
}

console.log(`CSV        : ${lignes.length - 1} lignes, séparateur « ${sep === "\t" ? "tab" : sep} »`);
console.log(`colonnes   : e-mail = « ${entetes[iEmail]} »${iPrenom >= 0 ? `, prénom = « ${entetes[iPrenom]} »` : ", prénom absent"}`);
console.log(`retenues   : ${vus.size} adresses uniques et valides`);
console.log(`écartées   : ${invalides} lignes sans adresse exploitable, ${lignes.length - 1 - invalides - vus.size} doublons`);

// ── SQL ──────────────────────────────────────────────────────────────────
const litteral = (s) => `'${String(s).replace(/'/g, "''")}'`;
const entrees = [...vus.entries()];
const paquets = [];
for (let i = 0; i < entrees.length; i += 500) {
  paquets.push(
    `insert into _sio_import (email, prenom) values\n` +
      entrees.slice(i, i + 500).map(([e, p]) => `  (${litteral(e)}, ${p ? litteral(p) : "null"})`).join(",\n") +
      ";",
  );
}

const sql = `-- Périmètre « Al Baraka 200 €/mois » — engendré par scripts/perimetre-albaraka-200.mjs
-- ${entrees.length} adresses issues de l'export Systeme.io (actifs, sans paiement).
-- NE PAS COMMITER : données personnelles, dépôt public.

begin;

create temporary table _sio_import (email text primary key, prenom text) on commit drop;

${paquets.join("\n\n")}

-- On repart de zéro : un rechargement doit donner le même résultat.
delete from email_campaign_recipients where campaign_slug = 'albaraka_200_lancement';

with candidats as (
  -- Les contacts de la plateforme…
  select lower(trim(c.email)) as email, nullif(trim(split_part(coalesce(c.full_name,''), ' ', 1)), '') as prenom
  from contacts c
  where c.email is not null and c.email <> ''
  union
  -- …et ceux de l'export Systeme.io.
  select i.email, nullif(trim(i.prenom), '') from _sio_import i
),
dedoublonnes as (
  select email, max(prenom) as prenom from candidats group by email
),
retenus as (
  select d.* from dedoublonnes d
  where d.email not in (select x.email from public.emails_a_exclure_albaraka_200() x)
),
chaleur as (
  select r.email, r.prenom,
    case
      when exists (
        select 1 from email_campaign_sends s
        join email_campaign_events e on e.resend_email_id = s.resend_email_id
        where lower(trim(s.recipient_email)) = r.email and e.event_type = 'email.opened'
      ) then 1                                    -- a déjà ouvert : le plus sûr
      when exists (
        select 1 from email_campaign_sends s
        where lower(trim(s.recipient_email)) = r.email
      ) then 2                                    -- déjà contacté, jamais ouvert
      else 3                                      -- jamais contacté : le risque
    end as rang
  from retenus r
)
insert into email_campaign_recipients (campaign_slug, email, first_name, position)
select 'albaraka_200_lancement', email, prenom,
       row_number() over (order by rang, email)
from chaleur;

-- Contrôle : à relire AVANT de valider la transaction.
select count(*) as total,
       count(*) filter (where position <= 900) as trois_premiers_lots
from email_campaign_recipients where campaign_slug = 'albaraka_200_lancement';

-- commit;  -- à décommenter une fois les chiffres validés
`;

writeFileSync(sortie, sql);
console.log(`\nSQL écrit  : ${sortie}`);
console.log(`Il se termine par un SELECT de contrôle et un commit COMMENTÉ : rien n'est écrit tant que le commit n'est pas décommenté.`);
