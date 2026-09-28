// Construction de l'email de rappel avant prélèvement — sans dépendance
// réseau, pour être testée (src/lib/rappelPrelevement.test.ts) et relue
// facilement. Texte validé par Hassan le 28/09/2026 : ne pas le reformuler.

export const TZ = "Europe/Paris";

// ── Dates (toujours à l'heure de Paris) ────────────────────────────────────

/** AAAA-MM-JJ d'un instant, à Paris. */
export function jourParis(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function decaler(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** « jeudi 1er octobre 2026 ». */
export function dateLongue(jour: string, avecAnnee = true): string {
  const d = new Date(`${jour}T12:00:00Z`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...o }).format(d);
  const numero = d.getUTCDate() === 1 ? "1er" : String(d.getUTCDate());
  return `${f({ weekday: "long" })} ${numero} ${f({ month: "long" })}${avecAnnee ? ` ${f({ year: "numeric" })}` : ""}`;
}
export const euros = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[  ]/g, " ") + " €";

/** Le libellé de l'offre, tel qu'un client le reconnaît. */
export function libelleOffre(produit: string | null): string {
  const p = (produit ?? "").trim().toUpperCase();
  if (p.startsWith("BUSINESS DEVELOP")) return "Business Developer";
  if (p === "PASS AL BARAKA") return "Pass AL BARAKA";
  if (p === "PASS LIBERTY") return "Pass Liberty";
  return produit?.trim() || "AL BARAKA";
}
export const prenomDe = (nom: string | null) => {
  const p = (nom ?? "").trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
};
export const echapper = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const masquer = (email: string) => email.replace(/^(.).*(@.*)$/, "$1***$2");

// ── L'email ───────────────────────────────────────────────────────────────

export interface Rappel {
  prenom: string;
  email: string;
  montant: number;
  jour: string; // date du prélèvement AAAA-MM-JJ
  offre: string;
  numero: number | null;
  total: number | null;
  carte: string | null;
}

export function construireEmail(r: Rappel) {
  const date = dateLongue(r.jour);
  const dateSansAnnee = dateLongue(r.jour, false);
  const veille = dateLongue(decaler(r.jour, -1), false);
  const echeance = r.numero && r.total ? ` — mensualité ${r.numero} sur ${r.total}` : "";
  const carte = r.carte ? `carte bancaire se terminant par ${r.carte}` : "carte bancaire enregistrée";
  const salut = r.prenom ? `As salam alaykoum ${r.prenom},` : "As salam alaykoum,";

  const sujet = `Ton prélèvement AL BARAKA du ${dateSansAnnee}`;
  const apercu = `Pense à approvisionner ton compte dès le ${veille}.`;

  const lignes: [string, string][] = [
    ["Montant", euros(r.montant)],
    ["Date du prélèvement", date],
    ["Offre", `${r.offre}${echeance}`],
    ["Moyen de paiement", carte],
  ];

  const texte = [
    salut,
    "",
    `Petit rappel pour t'éviter toute mauvaise surprise : ta prochaine échéance AL BARAKA sera prélevée le ${dateSansAnnee}.`,
    "",
    ...lignes.map(([k, v]) => `${k} : ${v}`),
    "",
    `Le prélèvement peut intervenir à tout moment de la journée, y compris tôt le matin. Pour que tout se passe bien, assure-toi que ton compte est suffisamment approvisionné dès la veille, le ${veille}. Un prélèvement refusé peut entraîner des frais de la part de ta banque, et on préfère t'éviter ça.`,
    "",
    "Une question, une carte qui a changé ou une difficulté passagère ? Envoie-nous un message : on est là pour trouver une solution avec toi, avant la date du prélèvement.",
    "",
    "Qu'Allah facilite ton activité et y mette la baraka.",
    "",
    "Wa salam alaykoum,",
    "L'équipe AL BARAKA",
  ].join("\n");

  const OR = "#D4AF37";
  const P = (html: string, extra = "") =>
    `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;color:#EDEDED;${extra}">${html}</p>`;
  const tableau = lignes
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;font-size:13px;color:#9A9A9A;width:42%;vertical-align:top;">${k}</td><td style="padding:6px 0;font-size:15px;color:#EDEDED;">${echapper(v)}</td></tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>${echapper(sujet)}</title></head>
<body style="margin:0;padding:0;background-color:#0A0A0A;font-family:Georgia,'Times New Roman',serif;color:#EDEDED;">
<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${echapper(apercu)}</span>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0A0A0A"><tr><td align="center" style="padding:40px 16px;">
<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#141414" style="width:600px;max-width:600px;background-color:#141414;border:1px solid rgba(212,175,55,0.25);border-radius:12px;">
<tr><td align="center" style="padding:44px 32px 12px;"><h1 style="margin:0;font-size:30px;color:${OR};letter-spacing:6px;font-weight:normal;">AL BARAKA</h1><div style="width:60px;height:1px;background-color:${OR};margin:22px auto 0 auto;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>
<tr><td style="padding:28px 40px 12px;">
<h2 style="margin:0 0 20px 0;font-size:21px;color:#EDEDED;font-weight:normal;">${echapper(salut)}</h2>
${P(`Petit rappel pour t'éviter toute mauvaise surprise : ta prochaine échéance AL BARAKA sera prélevée le <strong style="color:${OR};font-weight:normal;">${echapper(dateSansAnnee)}</strong>.`)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 24px 0;"><tr><td style="background-color:rgba(212,175,55,0.07);border:1px solid rgba(212,175,55,0.35);border-radius:10px;padding:16px 22px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${tableau}</table></td></tr></table>
${P(`Le prélèvement peut intervenir à tout moment de la journée, y compris tôt le matin. Pour que tout se passe bien, assure-toi que ton compte est suffisamment approvisionné <strong style="color:${OR};font-weight:normal;">dès la veille, le ${echapper(veille)}</strong>. Un prélèvement refusé peut entraîner des frais de la part de ta banque, et on préfère t'éviter ça.`)}
${P("Une question, une carte qui a changé ou une difficulté passagère ? Envoie-nous un message : on est là pour trouver une solution avec toi, avant la date du prélèvement.")}
${P("Qu'Allah facilite ton activité et y mette la baraka.", "font-style:italic;margin-bottom:28px;")}
<p style="margin:0 0 6px 0;font-size:14px;color:#9A9A9A;">Wa salam alaykoum,</p>
<p style="margin:0 0 28px 0;font-size:14px;color:${OR};">L'équipe AL BARAKA</p>
</td></tr></table></td></tr></table></body></html>`;

  return { sujet, html, texte };
}

