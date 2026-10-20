// Vérification de l'e-mail saisi sur les bons de commande (cas Issa Hotte, 20/10/2026 :
// « i.hotte.@live.fr » est passé, le compte a été créé avec cette adresse et les accès ne
// sont jamais arrivés). Avant, seule la présence d'un « @ » était vérifiée.

/** null si l'adresse est utilisable, sinon le message à afficher. */
export function verifierEmail(saisie: string): string | null {
  const email = (saisie ?? "").trim();
  if (!email) return "Indique ton adresse e-mail.";
  if (/\s/.test(email)) return "L'adresse e-mail ne doit pas contenir d'espace.";
  const morceaux = email.split("@");
  if (morceaux.length !== 2) return "L'adresse e-mail doit contenir un seul « @ ».";
  const [local, domaine] = morceaux;
  if (!local) return "Il manque le début de l'adresse, avant le « @ ».";
  if (local.endsWith(".")) return "Vérifie ton adresse e-mail : il y a un point juste avant le « @ ».";
  if (local.startsWith(".")) return "Vérifie ton adresse e-mail : elle ne peut pas commencer par un point.";
  if (local.includes("..") || domaine.includes("..")) return "Vérifie ton adresse e-mail : il y a deux points à la suite.";
  if (!/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+$/.test(local)) return "L'adresse e-mail contient un caractère non autorisé.";
  if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(domaine) || domaine.startsWith("-") || domaine.includes(".-") || domaine.includes("-."))
    return "Vérifie la fin de ton adresse e-mail (par exemple « gmail.com »).";
  return null;
}
