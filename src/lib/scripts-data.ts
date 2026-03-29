export interface ScriptCase {
  type: "pos" | "neg";
  label: string;
  lines: string[];
}

export interface ScriptPhase {
  label: string;
  voix: "raison" | "enthousiasme" | "sincerite" | "curiosite";
  lines: string[];
  cases?: ScriptCase[];
}

export interface Script {
  id: string;
  nom: string;
  icon: string;
  couleur: string;
  description: string;
  phases: ScriptPhase[];
}

export const VOIX_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  raison: { label: "🧠 Voix de la raison", color: "text-slate-600", bgColor: "bg-slate-100" },
  enthousiasme: { label: "🔥 Voix de l'enthousiasme", color: "text-orange-600", bgColor: "bg-orange-100" },
  sincerite: { label: "💚 Voix de la sincérité", color: "text-emerald-600", bgColor: "bg-emerald-100" },
  curiosite: { label: "🤔 Voix de la curiosité", color: "text-purple-600", bgColor: "bg-purple-100" },
};

export const SCRIPTS_SETTING: Script[] = [
  {
    id: "setting-rdv",
    nom: "Setting RDV",
    icon: "💬",
    couleur: "teal",
    description: "Script pour la prise de rendez-vous téléphonique",
    phases: [
      {
        label: "Avant d'envoyer — ciblage",
        voix: "raison",
        lines: [
          "Cibler les bons profils AVANT d'envoyer.",
          "Le premier message doit être assez captivant pour susciter l'intérêt et générer une conversation.",
          "FAITES UN VOCAL — pas un message texte !"
        ]
      },
      {
        label: "1 — Vocal d'accroche",
        voix: "enthousiasme",
        lines: [
          "'Salamou 'alaykoum, moi c'est [prénom].'",
          "'Je travaille actuellement avec une équipe d'entrepreneurs et d'entrepreneuses et on essaye d'apporter des compétences utiles à la communauté pour l'aider à générer des revenus en ligne et potentiellement s'expatrier et quitter l'Europe car comme tu le sais c'est devenu compliqué.'",
          "'Est-ce que tu t'es déjà intéressé à ce genre d'activité ?'",
          "→ Attendre le OUI",
          "'En toute sincérité, je sais que ça ne va pas changer ta vie, mais j'ai une vidéo de 2-3 minutes sur un nouveau business model en ligne qui pourrait t'intéresser.'",
          "'Est-ce que t'es ok pour que je te l'envoie ? Tu me fais un retour juste après ?'",
          "→ Attendre le OUI et envoyer la vidéo"
        ]
      },
      {
        label: "2 — Après la vidéo",
        voix: "sincerite",
        lines: [
          "Attendre le retour. Si silence après 48h : relancer avec '?' uniquement."
        ],
        cases: [
          {
            type: "pos",
            label: "Si curiosité / 'Peux-tu m'en dire plus ?'",
            lines: [
              "'Bah écoute, je sais que la vidéo ne te dévoile pas tout et pour rester sincère, c'est voulu.'",
              "'En fait la réalité c'est qu'on ne peut pas expliquer tout un métier et tout un système par message, ce serait pas vraiment sérieux tu vois ?'",
              "'Mais si tu veux on peut en discuter de vive voix, ça te va ?'",
              "→ Attendre le OUI. Si non : souhaiter bonne journée et clôturer."
            ]
          },
          {
            type: "neg",
            label: "Si pas de réponse après 2 relances",
            lines: [
              "Clore proprement. Passer au profil suivant. Maximum 2 relances au total."
            ]
          }
        ]
      },
      {
        label: "3 — Prise de RDV",
        voix: "curiosite",
        lines: [
          "[Voix curiosité] : 'Très bien, du coup dis-moi, c'est quoi ton prénom ?'",
          "[Voix sincérité] : 'Très bien [Prénom], ce que je peux te proposer, c'est un petit appel de quelques minutes comme ça on fait rapidement connaissance et je t'explique le métier, ça te va ?'",
          "→ Attendre le OUI. Si non : bonne journée et clôturer."
        ],
        cases: [
          {
            type: "pos",
            label: "Si disponible maintenant",
            lines: [
              "'OK, laisse-moi ton numéro stp, je vais t'appeler sur WhatsApp si c'est ok pour toi.'"
            ]
          },
          {
            type: "neg",
            label: "Si indisponible",
            lines: [
              "'OK, tu seras disponible à quelle heure aujourd'hui ? Comme ça je m'organise de mon côté pour prendre le temps de t'expliquer.'",
              "Verrouiller l'heure précise du rendez-vous."
            ]
          }
        ]
      }
    ]
  },
  {
    id: "setting-conf",
    nom: "Setting Conférence",
    icon: "📣",
    couleur: "teal",
    description: "Script pour l'invitation à une conférence",
    phases: [
      {
        label: "Avant d'envoyer — ciblage",
        voix: "raison",
        lines: [
          "Cibler les bons profils AVANT d'envoyer.",
          "FAITES UN VOCAL — pas un message texte !"
        ]
      },
      {
        label: "1 — Vocal d'accroche conférence",
        voix: "enthousiasme",
        lines: [
          "'Salamou 'alaykoum, moi c'est [prénom].'",
          "'Je travaille actuellement avec une équipe d'entrepreneurs et d'entrepreneuses et on essaye d'apporter des compétences utiles à la communauté pour l'aider à générer des revenus en ligne et potentiellement s'expatrier et quitter l'Europe.'",
          "'Est-ce que tu t'es déjà intéressé à ce genre d'activité ?'",
          "→ Attendre le OUI",
          "'En toute sincérité, je sais que ça ne va pas changer ta vie, mais j'ai une vidéo de 2-3 minutes sur un nouveau business model qui pourrait t'intéresser.'",
          "'Est-ce que t'es ok pour que je te l'envoie ? Tu me fais un retour juste après ?'",
          "→ Attendre le OUI. Envoyer la vidéo."
        ]
      },
      {
        label: "2 — Après la vidéo + invitation",
        voix: "sincerite",
        lines: [
          "Attendre le retour. Si silence après 48h : relancer avec '?'."
        ],
        cases: [
          {
            type: "pos",
            label: "Si curiosité",
            lines: [
              "'Bah écoute je sais que la vidéo ne te dévoile pas tout et pour rester sincère, c'est voulu.'",
              "'En fait la réalité c'est qu'on ne peut pas expliquer tout un métier et tout un système par message, c'est pour ça qu'on prend le temps de faire une conférence remplie de valeur pour les personnes qui souhaitent vraiment apprendre quelque chose de sérieux. En plus, la conférence est gratuite.'",
              "'Est-ce tu souhaites prendre le temps d'y participer de ton côté ? C'est dimanche à 18H30 inshaAllah.'",
              "→ Attendre le OUI. Si non : bonne journée et clôturer."
            ]
          },
          {
            type: "neg",
            label: "Si pas de réponse après 2 relances",
            lines: [
              "Clore proprement. Maximum 2 relances au total."
            ]
          }
        ]
      },
      {
        label: "3 — Qualification",
        voix: "curiosite",
        lines: [
          "[Voix curiosité] : 'Très bien, avant de t'intégrer à la conférence, dis-moi, c'est quoi ton prénom ?'",
          "'Et t'habites où au fait [Prénom] ?'",
          "'Et qu'est-ce qui t'intéresse dans une activité en ligne ?'",
          "'OK et tu fais quoi actuellement dans la vie ? Tu travailles ? T'es étudiant.e ?'",
          "Si flou : 'Comment subviens-tu à tes besoins actuellement ?'"
        ],
        cases: [
          {
            type: "pos",
            label: "Voir si le profil convient",
            lines: [
              "[Voix curiosité] : 'Ce qu'on propose demande d'être un minimum à l'aise avec les gens et le français, est-ce que c'est ton cas ?'",
              "'Et tu serais prêt.e à apprendre à utiliser les réseaux sociaux (même sans te montrer) ?'",
              "[Voix de l'évidence] : 'Je pense que tu le sais, on ne peut pas gagner sa vie sans fournir d'effort, de ton côté est-ce que t'aurais au moins 2H/Jour si ça peut te permettre d'aller chercher 1 000€ à la fin du mois ?'",
              "→ Attendre le OUI. Si non : bonne journée."
            ]
          },
          {
            type: "neg",
            label: "Si condition bloquante",
            lines: [
              "Clore respectueusement. Passer au profil suivant."
            ]
          }
        ]
      },
      {
        label: "4 — Intégration groupe WhatsApp",
        voix: "sincerite",
        lines: [
          "[Voix sincérité] : 'Très bien, bah c'est parti [Prénom], tu peux me donner ton numéro pour que je puisse t'intégrer au groupe stp ?'",
          "Envoyer le lien du groupe privé.",
          "'Sois bien connecté [JOUR] à [XXH] car le lien de la conférence sera envoyé dans le groupe 5 minutes avant.'",
          "'C'est ok pour toi ? Est-ce que tu veux que je t'envoie un message de rappel 1h avant ?'",
          "Puis lui souhaiter une bonne journée et clôturer."
        ]
      }
    ]
  }
];
