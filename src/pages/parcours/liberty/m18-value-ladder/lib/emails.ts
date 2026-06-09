/**
 * M18 — Générateur de séquences email d'ascension (100% déterministe, SANS IA).
 * Copywriting interpolé sur la niche ; variante ADOUCIE pour les niches sensibles.
 * [prénom], [lien], [Ton prénom] = champs de fusion littéraux (jamais substitués).
 */
import { type M18State, type EmailOverride, fmtEur } from "./types";
import { getPrixLT, getPrixMT, getPrixHT, hasLT } from "./validations";

export interface Email { jour: string; objet: string; corps: string; }
export interface EffectiveEmail extends Email { edited: boolean; }

function _normAccents(s: any): string { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
const SENSITIVE_PATTERNS = ["deuil", "deces", "perte d", "endeuill", "veuf", "veuve", "orphelin", "maladie", " malade", "cancer", "depression", "addiction", "dependance", "trauma", "traumatis", "suicid", "handicap", "fin de vie", "soins palliatif", "guerison", "souffrance"];
export function isSensitiveNiche(state: M18State): boolean {
  const n = _normAccents((state.m1_data && state.m1_data.niche) || "") + " " + _normAccents((state.m12_data && state.m12_data.programme_baseline) || "");
  return SENSITIVE_PATTERNS.some((p) => n.indexOf(p) >= 0);
}

interface EmailCtx {
  avatar: string; niche: string; transformation: string; pain: string;
  ltNom: string; ltPrix: number; mtNom: string; mtPrix: number; mtPrixLabel: string; mtFormat: string;
  htNom: string; htPrix: number; mechLtMt: string; mechMtHt: string; connexion: string; halal: boolean; sign: string;
}
function _emailCtx(state: M18State): EmailCtx {
  const m1 = state.m1_data || {}, m5 = state.m5_data || {}, m6 = state.m6_data || {};
  const m11 = state.m11_data || {}, m12 = state.m12_data || {}, m14 = state.m14_data || {};
  const d = state.data;
  const transformation = m12.programme_baseline || m11.point_b || m5.ht_point_b || m14.point_b_ht || "le résultat que tu vises vraiment";
  const pain = m5.ht_point_a || m11.point_a || "";
  const halal = !!(m6.halal_no_riba || m14.halal_no_riba);
  const mtFormat = (d.niveaux.mt.format || "").trim();
  const mtPrix = getPrixMT(state);
  let mtPrixLabel = fmtEur(mtPrix);
  const mois = mtFormat.match(/(\d[\d.\s  ]*)\s*€?\s*\/?\s*mois/i);
  if (mois) mtPrixLabel = mois[1].replace(/[.\s  ]/g, "").trim() + " €/mois";
  else if (m14 && m14.mt_prix && /membership|mensuel|abonnement/i.test(mtFormat) && m14.mt_prix !== mtPrix) mtPrixLabel = fmtEur(m14.mt_prix) + "/mois";
  return {
    avatar: m1.avatar_nom || "",
    niche: m1.niche || "",
    transformation: String(transformation).replace(/\.$/, ""),
    pain: String(pain).replace(/\.$/, ""),
    ltNom: (d.niveaux.lt.nom || "").trim() || "ton offre d’entrée",
    ltPrix: getPrixLT(state),
    mtNom: (d.niveaux.mt.nom || "").trim() || "ton programme",
    mtPrix,
    mtPrixLabel,
    mtFormat,
    htNom: (d.niveaux.ht.nom || "").trim() || "ton accompagnement",
    htPrix: getPrixHT(state),
    mechLtMt: (d.transitions.lt_mt || "").trim(),
    mechMtHt: (d.transitions.mt_ht || "").trim(),
    connexion: (d.connexion_lt_mt || "").trim(),
    halal,
    sign: halal ? "Qu’AllAh facilite,\n[Ton prénom]" : "[Ton prénom]",
  };
}

/* ---------- Séquences STANDARD (niches business / compétence) ---------- */
function _emailsLtMt(c: EmailCtx): Email[] {
  return [
    { jour: "J+0 · livraison", objet: "Ouvre ça maintenant (avant que ça finisse oublié dans tes onglets)", corps: `As salamou ’alaykoum [prénom],

Ça y est : ton accès à « ${c.ltNom} » est ouvert, juste ici → [lien]

Je vais être direct avec toi, parce que je préfère ça à te flatter : la plupart des gens qui achètent quelque chose comme ça ne l’ouvrent jamais vraiment. Ils le rangent dans un coin « pour plus tard »… et plus tard n’arrive jamais.

Ne fais pas ça. Pas cette fois.

Voici ce que je te demande, et c’est tout : bloque 30 minutes aujourd’hui — pas demain, pas « ce week-end » — et fais la première étape jusqu’au bout. Une seule. L’objectif n’est pas que tu termines tout : c’est que tu obtiennes une première victoire concrète dans les 48 prochaines heures. Quelque chose que tu peux regarder en te disant « ok, ça marche ».

Parce que c’est cette première victoire qui change tout. C’est elle qui transforme « une formation de plus » en vrai déclic.

Quand c’est fait, réponds simplement à cet email avec un mot : « fait ✅ ». Je lis tout.

${c.sign}

PS — Si tu bloques sur quoi que ce soit, réponds-moi. Je préfère mille fois une question « bête » qu’un accès qui prend la poussière.` },
    { jour: "J+2 · projection", objet: `La vraie raison pour laquelle tu as pris « ${c.ltNom} »`, corps: `As salamou ’alaykoum [prénom],

Petite question — prends dix secondes pour y répondre honnêtement dans ta tête :

pourquoi tu as vraiment cliqué sur « ${c.ltNom} » ?

Ce n’était pas pour la vidéo, le PDF ou la méthode en eux-mêmes. Personne ne se réveille en rêvant d’« une formation de plus ». Ce que tu as acheté, au fond, c’est un début de chemin vers autre chose : ${c.transformation}.

${c.pain ? `Aujourd’hui, le point de départ ressemble peut-être à ça : ${c.pain}. Je sais à quel point c’est lourd à porter, jour après jour.` : `Tu sais où tu en es aujourd’hui. Et tu sais, au fond, où tu veux aller.`}

Alors fais-moi une faveur : ferme les yeux deux secondes et imagine la version de toi qui y est arrivée. Pas dans dix ans — dans quelques mois, en suivant un plan clair, une étape après l’autre. Cette personne-là existe déjà en germe. La seule différence entre toi et elle, c’est la distance que tu vas parcourir.

« ${c.ltNom} » n’est que la première marche de ce chemin. Si tu ne l’as pas encore montée, c’est le moment. Et si c’est fait : la suivante t’attend déjà.

${c.sign}

PS — Garde cette image en tête : ${c.transformation}. C’est elle qui doit décider à ta place les jours où la motivation n’est pas au rendez-vous.` },
    { jour: "J+4 · le plafond", objet: "Le plafond que tu vas bientôt toucher", corps: `As salamou ’alaykoum [prénom],

Il faut que je sois honnête avec toi sur « ${c.ltNom} ».

C’est un excellent point de départ. Mais c’est, par construction, une pièce du puzzle — pas le puzzle entier. Et très vite, tu vas toucher un plafond. C’est normal. C’est même fait pour.

${c.connexion ? c.connexion : `« ${c.ltNom} » te donne un résultat sur un point précis. Mais ce point, isolé, ne tient pas tout seul : il s’inscrit dans un système plus large, et c’est ce système qui fait la différence entre un coup de chance ponctuel et un résultat qui dure.`}

À partir de là, tu as deux options.

La première : continuer pièce par pièce. Récupérer un bout de méthode ici, une astuce là, une vidéo gratuite ailleurs, et passer ton temps à essayer de recoller les morceaux. C’est faisable. C’est juste long, frustrant, et plein de trous.

La seconde : prendre la méthode complète, dans le bon ordre, sans trou. Celle qui te dit non seulement quoi faire, mais dans quel ordre et pourquoi.

Cette méthode complète, elle existe. Elle s’appelle « ${c.mtNom} »${c.mtFormat ? ` (${c.mtFormat})` : ""}.

Je t’explique tout demain. Garde un œil sur ta boîte mail.

${c.sign}

PS — Le plafond dont je te parle n’est pas un problème. C’est le signe que tu es prêt pour la marche d’au-dessus.` },
    { jour: "J+5 · l’offre", objet: `« ${c.mtNom} » : la méthode complète (ouvert 48 h)`, corps: `As salamou ’alaykoum [prénom],

Comme promis, je t’ouvre aujourd’hui l’accès à « ${c.mtNom} ».

C’est la version complète de ce que tu as goûté avec « ${c.ltNom} » : la méthode entière, structurée, dans le bon ordre, pour ${c.transformation} — sans bricoler et sans te demander en permanence « est-ce que je fais ça bien ? ».

${c.mechLtMt ? c.mechLtMt + `

` : ""}Concrètement, voici ce que ça change pour toi :

→ Tu arrêtes de collectionner des bouts de méthode éparpillés et tu suis UN chemin clair, du début à la fin.
→ Tu avances ${c.mtFormat ? `au format « ${c.mtFormat} »` : "à ton rythme"}, avec tout ce qu’il te faut réuni au même endroit.
→ Tu sais exactement quelle est la prochaine action à chaque étape — fini la paralysie du « par où je commence ? ».

L’investissement : ${c.mtPrixLabel}. Mets ça en face de ce que te coûte, vraiment, de rester bloqué encore six mois là où tu en es aujourd’hui — en temps, en énergie, et en occasions ratées.

J’ouvre l’accès pendant 48 h. Pas pour te mettre une pression artificielle : simplement parce que je préfère accompagner des gens qui décident, plutôt que des gens qui repoussent indéfiniment.

C’est par ici → [lien]

${c.sign}

PS — Une question avant de te lancer ? Réponds directement à cet email. C’est moi qui te réponds, personnellement.` },
    { jour: "J+6 · clôture", objet: `On ferme « ${c.mtNom} » ce soir`, corps: `As salamou ’alaykoum [prénom],

Dernier rappel sur « ${c.mtNom} », et je ne reviendrai pas dessus : l’accès ferme ce soir. Après, le lien ne fonctionnera plus.

Je ne vais pas te survendre. Je vais juste te poser la seule question qui compte vraiment :

dans six mois, tu veux en être où ?

Si la réponse honnête, c’est « à peu près au même point, à chercher des solutions à droite à gauche », alors ne fais rien. C’est un choix, et il est respectable.

Mais si ce que tu veux, c’est ${c.transformation}, alors tu sais déjà qu’on n’y arrive pas en accumulant des ressources gratuites à moitié appliquées. Il te faut un plan complet et l’engagement de le suivre. Le plan est là → [lien]

À toi de décider. Et sincèrement, j’espère te retrouver de l’autre côté.

${c.sign}

PS — La porte se referme ce soir. Pas de prolongation, pas de « session de rattrapage ». Si c’est pour toi, c’est maintenant.` },
  ];
}
function _emailsMtHt(c: EmailCtx): Email[] {
  return [
    { jour: "Fin de programme", objet: "Tu as fait le plus dur tout seul — voici ce qui te manque", corps: `As salamou ’alaykoum [prénom],

Tu as avancé dans « ${c.mtNom} » en autonomie. Franchement : c’est déjà énorme. La plupart des gens n’arrivent même pas au bout d’une formation. Toi, tu l’as fait.

Mais je veux être honnête avec toi sur la limite de l’autonomie, parce que peu de gens te le diront :

à un moment, ce qui te bloque, ce n’est plus l’information. L’information, tu l’as. Ce qui te bloque, c’est ton angle mort — ce détail dans TA situation que tu ne peux pas voir tout seul, justement parce que c’est la tienne. Et aucune vidéo, aussi bonne soit-elle, ne peut regarder ton cas précis et te dire : « là, tu te trompes — fais plutôt ça. »

C’est exactement ce qui sépare comprendre une méthode… et ${c.transformation} — pour de vrai.

Je t’écris dans deux jours avec une proposition concrète pour franchir ce cap. Reste à l’écoute.

${c.sign}

PS — Si tu as déjà eu un premier résultat grâce à « ${c.mtNom} », réponds-moi pour me le raconter. J’adore lire ça — et ça m’aide à savoir où tu en es vraiment.` },
    { jour: "+2 jours · invitation", objet: `Je n’ouvre que quelques places dans « ${c.htNom} »`, corps: `As salamou ’alaykoum [prénom],

Voilà ce dont je te parlais.

J’ouvre quelques places dans « ${c.htNom} » : un accompagnement rapproché où, cette fois, je travaille directement sur TON cas pour ${c.transformation}.

${c.mechMtHt ? c.mechMtHt + `

` : `La première étape, c’est un simple échange : on regarde ensemble où tu en es, et si c’est vraiment pertinent pour toi. Sans pression — et si ce n’est pas le bon moment, je te le dirai franchement.

`}Ce que ça change par rapport à « ${c.mtNom} » :

→ Un regard extérieur sur ta situation réelle, pas une méthode générique appliquée en aveugle.
→ Quelqu’un qui te dit quoi prioriser maintenant — et qui te le redit quand tu dévies.
→ De l’accountability : tu n’avances plus seul, et c’est très souvent ce qui fait toute la différence entre « j’ai compris » et « j’ai réussi ».

C’est un investissement de ${fmtEur(c.htPrix)}. Ce n’est pas une dépense de plus : c’est ce qui t’évite de perdre des mois à tâtonner seul.

Les places sont limitées, et ce n’est pas une formule marketing : c’est la condition pour que je puisse suivre chaque personne sérieusement.

Si tu te sens prêt → [lien]

${c.sign}

PS — Cet accompagnement n’est pas pour tout le monde. Si tu n’as pas encore appliqué « ${c.mtNom} », commence par là. Mais si c’est fait et que tu veux passer un cap, on devrait vraiment se parler.` },
    { jour: "+4 jours · clôture", objet: `Dernier appel pour « ${c.htNom} »`, corps: `As salamou ’alaykoum [prénom],

Je ferme les candidatures pour « ${c.htNom} » très bientôt — c’est donc mon dernier message à ce sujet.

Tu as deux chemins devant toi.

Le premier : continuer seul. C’est possible : tu as déjà la méthode avec « ${c.mtNom} ». Ça prendra sans doute plus de temps, avec quelques détours et quelques moments de doute, mais tu peux y arriver.

Le second : avancer accompagné. Avec un regard extérieur sur ton cas, et quelqu’un qui te tient quand ça coince. Plus court, plus sûr, et — soyons honnêtes — beaucoup plus serein.

Aucun des deux n’est « mauvais ». Mais si, au fond, tu sais que tu avances plus vite et plus loin quand tu n’es pas seul, alors tu connais déjà ta réponse → [lien]

${c.sign}

PS — Après la fermeture, je me consacre à 100 % aux personnes accompagnées. La prochaine ouverture n’est pas prévue avant un moment.` },
  ];
}

/* ---------- Séquences ADOUCIES (niches sensibles : deuil, santé, accompagnement…) ---------- */
function _emailsLtMtSoft(c: EmailCtx): Email[] {
  return [
    { jour: "J+0 · à ton rythme", objet: "C’est entre tes mains — prends le temps qu’il te faut", corps: `As salamou ’alaykoum [prénom],

Ton accès à « ${c.ltNom} » est ouvert, juste ici → [lien]

Il n’y a aucune urgence. Quand tu te sentiras prêt(e), installe-toi au calme et fais simplement le premier pas. Un seul. Pas besoin d’aller plus loin aujourd’hui.

Ce qui compte, ce n’est pas la vitesse — c’est que tu avances, à ton rythme, sans te mettre la pression.

Et si tu as la moindre question, ou simplement besoin d’en parler, réponds à cet email. Je lis tout, et je te répondrai.

${c.sign}

PS — Sois doux/douce avec toi-même. Le simple fait d’avoir commencé, c’est déjà beaucoup.` },
    { jour: "J+2 · le chemin", objet: "Là où ce chemin peut doucement te mener", corps: `As salamou ’alaykoum [prénom],

${c.pain ? `Je sais d’où tu pars : ${c.pain}. Et je sais qu’il y a des jours où c’est plus lourd que d’autres.` : `Je sais que ce chemin n’est pas toujours facile, et qu’il y a des jours plus lourds que d’autres.`}

Ce que je veux que tu gardes en tête, c’est qu’on n’avance pas d’un coup. On avance par petits pas, et chacun compte. « ${c.ltNom} » en est un. Le prochain viendra quand tu seras prêt(e).

L’horizon, ce n’est pas une performance à atteindre. C’est simplement : ${c.transformation}. Pas à pas, sans te brusquer.

${c.sign}

PS — Si aujourd’hui tu n’as pas la force d’ouvrir le programme, ce n’est pas grave. Il sera là demain.` },
    { jour: "J+4 · un cadre qui soutient", objet: "Pourquoi un cadre aide vraiment, dans ces moments-là", corps: `As salamou ’alaykoum [prénom],

« ${c.ltNom} » t’a donné un premier appui. C’est précieux. Mais sur un chemin comme le tien, avancer seul(e) avec des ressources éparpillées peut vite devenir épuisant.

${c.connexion ? c.connexion : `Ce qui aide vraiment, c’est un cadre clair : savoir quelle est la prochaine étape, et ne pas avoir à tout porter en même temps.`}

C’est exactement ce que propose « ${c.mtNom} »${c.mtFormat ? ` (${c.mtFormat})` : ""} : un chemin structuré, doux, que tu suis à ton rythme — sans te sentir perdu(e).

Je t’en reparle simplement, demain. Sans pression.

${c.sign}

PS — Tu n’as rien à prouver à personne. Juste à avancer un peu, quand tu le peux.` },
    { jour: "J+5 · une invitation", objet: `« ${c.mtNom} », si tu te sens prêt(e)`, corps: `As salamou ’alaykoum [prénom],

Je voulais simplement t’ouvrir l’accès à « ${c.mtNom} ».

${c.mechLtMt ? c.mechLtMt + `

` : ""}C’est un cadre complet et doux pour ${c.transformation}, à ton rythme, avec tout ce qu’il te faut réuni au même endroit. ${c.mtFormat ? `Le format : « ${c.mtFormat} ».` : ""}

L’accès est à ${c.mtPrixLabel}. Et il n’y a pas de date limite : tu le rejoins le jour où tu sens que c’est le bon moment pour toi. Pas avant.

Si tu as la moindre question, réponds-moi — on en parle tranquillement → [lien]

${c.sign}

PS — Quoi que tu décides, prends soin de toi. C’est le plus important.` },
  ];
}
function _emailsMtHtSoft(c: EmailCtx): Email[] {
  return [
    { jour: "Un mot", objet: "Tu n’as pas à avancer seul(e)", corps: `As salamou ’alaykoum [prénom],

Tu as parcouru un bout de chemin avec « ${c.mtNom} », et je tiens à te le dire : c’est courageux. Sur un sujet comme le tien, chaque pas demande de l’énergie.

Je voulais juste te rappeler une chose simple : tu n’es pas obligé(e) de tout porter seul(e). Parfois, ce qui change tout, ce n’est pas une information de plus — c’est une présence à tes côtés, quelqu’un qui regarde ta situation avec toi et qui t’accompagne pas à pas.

Je t’écris dans quelques jours pour t’en dire plus, en toute simplicité.

${c.sign}

PS — D’ici là, sois patient(e) avec toi-même. Tu fais déjà beaucoup.` },
    { jour: "Une invitation", objet: "Une invitation à être accompagné(e) de plus près", corps: `As salamou ’alaykoum [prénom],

Comme je te le disais, je voulais t’ouvrir la porte de « ${c.htNom} » : un accompagnement rapproché, pour ${c.transformation}, sans rester seul(e) avec ça.

${c.mechMtHt ? c.mechMtHt + `

` : `La première étape, c’est simplement un échange : on prend le temps de voir où tu en es, et si cet accompagnement est juste pour toi en ce moment. Sans aucun engagement.

`}Ce que ça change, c’est surtout ça : une présence régulière, quelqu’un qui connaît ta situation et qui t’aide à avancer à ton rythme, sans jamais te brusquer.

L’accompagnement est à ${fmtEur(c.htPrix)}. Et je n’accompagne que quelques personnes à la fois — non pas pour créer de la rareté, mais simplement pour pouvoir être pleinement présent(e) pour chacune.

Si tu en ressens le besoin, écris-moi, on en parle → [lien]

${c.sign}

PS — Et si ce n’est pas le bon moment pour toi, c’est parfaitement ok. L’invitation reste ouverte.` },
    { jour: "Toujours là", objet: "Toujours là, si tu en ressens le besoin", corps: `As salamou ’alaykoum [prénom],

Juste un dernier mot, tout simple.

L’invitation à rejoindre « ${c.htNom} » reste ouverte. Il n’y a pas de compte à rebours, pas de « dernière chance » : ce genre de décision ne se prend pas sous pression, surtout sur un sujet aussi personnel que le tien.

Le jour où tu sentiras que tu as besoin d’être accompagné(e) d’un peu plus près, je serai là → [lien]

En attendant, continue à ton rythme. Tu fais ce qu’il faut.

${c.sign}

PS — Prends soin de toi, [prénom]. Vraiment.` },
  ];
}

export function buildAscensionEmails(state: M18State, key: "lt_mt" | "mt_ht"): Email[] {
  const c = _emailCtx(state);
  const soft = isSensitiveNiche(state);
  if (key === "lt_mt") return hasLT(state) ? (soft ? _emailsLtMtSoft(c) : _emailsLtMt(c)) : [];
  if (key === "mt_ht") return soft ? _emailsMtHtSoft(c) : _emailsMtHt(c);
  return [];
}

/** Fusionne modèle généré + retouches sauvegardées de l'élève. */
export function effectiveEmails(state: M18State, key: "lt_mt" | "mt_ht"): EffectiveEmail[] {
  const tpl = buildAscensionEmails(state, key);
  const ov: EmailOverride[] = (state.data.emails && state.data.emails[key]) || [];
  return tpl.map((e, i) => {
    const o = ov[i] || {};
    const objet = typeof o.objet === "string" ? o.objet : e.objet;
    const corps = typeof o.corps === "string" ? o.corps : e.corps;
    const edited = (typeof o.objet === "string" && o.objet !== e.objet) || (typeof o.corps === "string" && o.corps !== e.corps);
    return { jour: e.jour, objet, corps, edited };
  });
}
