// ─────────────────────────────────────────────────────────────────────────
// Les trois textes légaux, repris MOT POUR MOT du cahier des charges
// d'Ethicarena (version 1.0 du 25/09/2026, annexes A, B et C).
//
// « Les textes juridiques à publier figurent en annexe : ils doivent être
// repris mot pour mot, sans reformulation. » C'est une consigne, pas une
// préférence de style : un texte publié qui diffère de celui validé n'engage
// plus la société de la même façon. Un test compare chaque ligne au document
// d'origine — toute retouche, même une virgule, le fera échouer.
//
// Ils vivent ici, en données, et non dans le JSX : la mise en page peut
// changer sans qu'on touche à une phrase, et la comparaison reste possible.
//
// ⚠️ La société qui édite et vend est ETHICARENA L.L.C-FZ. AL BARAKA est une
// marque, pas une société. Aucune page ne doit présenter « AL BARAKA » comme
// raison sociale.
// ─────────────────────────────────────────────────────────────────────────

/** Une ligne du texte : un titre d'article, un paragraphe, ou une puce. */
export type LigneLegale = string;

export interface PageLegale {
  /** Le chemin public. Il est cité dans les textes eux-mêmes : on ne le change pas. */
  chemin: string;
  titre: string;
  /** Le titre de l'onglet du navigateur. */
  titreOnglet: string;
  /** Vrai si la page doit porter « Dernière mise à jour ». */
  dateDeMiseAJour: boolean;
  lignes: LigneLegale[];
}

/**
 * La date de mise en ligne, affichée en haut de la politique de
 * confidentialité et des CGV. Le cahier des charges demande de remplacer
 * « [JJ/MM/2026] » par la date réelle.
 */
export const DATE_MISE_A_JOUR = "25/09/2026";

/**
 * Le PDF des CGV, daté et archivé.
 *
 * Le cahier des charges (§3.2) demande que le client puisse CONSERVER les
 * CGV — la loi l'impose — et que chaque ancienne version reste accessible :
 * en cas de litige, il faut pouvoir prouver quelle version il a acceptée.
 * D'où un nom de fichier daté, et non un « cgv.pdf » qu'on écraserait.
 *
 * Il est engendré depuis CE fichier par `scripts/generer-cgv-pdf.mjs` : la
 * page et le PDF ne peuvent donc pas diverger. Publier une version 2 suppose
 * de régénérer le PDF sous un nouveau nom et de laisser l'ancien en place.
 */
export const PDF_CGV = "/cgv/cgv-2026-09-25.pdf";

export const MENTIONS_LEGALES: PageLegale = {
  chemin: "/mentions-legales",
  titre: "Mentions légales",
  titreOnglet: "Mentions légales — AL BARAKA",
  dateDeMiseAJour: false,
  lignes: [
    "Bienvenue sur la plateforme AL BARAKA, accessible à l'adresse https://plateforme.albarakaecosysteme.com (ci-après la « Plateforme »).",
    "1. Éditeur",
    "La Plateforme, la marque AL BARAKA et l'ensemble de l'écosystème AL BARAKA sont la propriété exclusive de la société ETHICARENA L.L.C-FZ, qui les exploite et les édite.",
    "Dénomination sociale : ETHICARENA L.L.C-FZ",
    "Siège social : Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubaï, Émirats arabes unis",
    "Numéro de licence : 2422583.01",
    "Représentant légal et directeur de la publication : Sid Ali GHALMI",
    "Contact : contact@ethicarena.com",
    "2. Hébergement",
    "La Plateforme AL BARAKA, y compris les pages de vente et les formations, est hébergée par :",
    "HOSTINGER INTERNATIONAL LTD, 61 Lordou Vironos Street, 6023 Larnaca, Chypre – https://www.hostinger.fr/contact",
    "3. Propriété intellectuelle",
    "L'ensemble des contenus de la Plateforme (textes, vidéos, modules, outils, visuels, logos, marque AL BARAKA) est la propriété exclusive d'ETHICARENA L.L.C-FZ. Il est protégé par le droit de la propriété intellectuelle.",
    "Toute reproduction, modification, diffusion ou exploitation, totale ou partielle, sans autorisation écrite préalable d'ETHICARENA L.L.C-FZ est strictement interdite. Cela inclut le partage des accès et des contenus des formations.",
    "4. Conditions d'utilisation",
    "Il est interdit d'extraire, de collecter ou d'exploiter les données personnelles des autres utilisateurs accessibles sur la Plateforme ou dans les espaces communautaires AL BARAKA.",
    "Les informations présentées sur la Plateforme sont fournies à titre indicatif. ETHICARENA L.L.C-FZ s'efforce de les maintenir exactes et à jour, mais ne peut garantir leur exhaustivité.",
    "L'utilisateur est seul responsable de l'usage qu'il fait des prestations et services proposés. La responsabilité d'ETHICARENA L.L.C-FZ, de son gérant, de ses associés, de ses préposés et de tout intervenant ne saurait être engagée en cas d'utilisation malveillante, inappropriée ou illégale de ces prestations et services par l'utilisateur.",
    "Le contenu des formations doit être appliqué avec discernement. Les exemples présentés ont une vocation illustrative : ils sont subjectifs et ne constituent pas une vérité universelle.",
    "Les présentes mentions légales peuvent évoluer. Il est conseillé de les consulter régulièrement.",
    "5. Résultats non garantis",
    "Les formations, programmes et accompagnements AL BARAKA ne garantissent aucun résultat, notamment financier. Les résultats obtenus dépendent de nombreux facteurs propres à chaque personne : implication, compétences, situation de départ et contexte de marché.",
    "6. Données personnelles et cookies",
    "Les informations relatives à la collecte et au traitement des données personnelles, ainsi qu'à l'utilisation des cookies et outils de mesure d'audience, sont détaillées dans notre Politique de confidentialité.",
    "Pour toute question ou demande relative à vos données (accès, rectification, suppression) : contact@ethicarena.com.",
    "7. Paiement sécurisé",
    "Le paiement des formations et programmes est traité par Stripe, prestataire de paiement en ligne. ETHICARENA L.L.C-FZ n'a jamais accès à vos coordonnées bancaires complètes. Pour toute question : contact@ethicarena.com.",
    "8. Mentions relatives à Meta et Google",
    "Ce site ne fait pas partie du site web Facebook ou de Meta Platforms, Inc., ni de Google LLC. En outre, ce site n'est pas endossé par Facebook en aucune façon, ni par Google LLC. Facebook est une marque déposée de Meta Platforms, Inc.",
  ],
};

export const POLITIQUE_CONFIDENTIALITE: PageLegale = {
  chemin: "/politique-de-confidentialite",
  titre: "Politique de confidentialité",
  titreOnglet: "Politique de confidentialité — AL BARAKA",
  dateDeMiseAJour: true,
  lignes: [
    "La présente politique explique comment ETHICARENA L.L.C-FZ collecte, utilise, conserve et protège les données personnelles des utilisateurs de la plateforme AL BARAKA, accessible à l'adresse https://plateforme.albarakaecosysteme.com (ci-après la « Plateforme »). Elle couvre aussi l'ensemble des services de l'écosystème AL BARAKA : formations, accompagnements, communauté et rendez-vous.",
    "Elle est établie conformément au Règlement (UE) 2016/679 (RGPD), à la directive 2002/58/CE (« ePrivacy ») et, pour les utilisateurs résidant en France, à la loi Informatique et Libertés du 6 janvier 1978 modifiée.",
    "1. Responsable du traitement",
    "ETHICARENA L.L.C-FZ, propriétaire et exploitante de la Plateforme et de la marque AL BARAKA.",
    "Siège social : Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubaï, Émirats arabes unis",
    "Numéro de licence : 2422583.01",
    "Contact données personnelles : contact@ethicarena.com",
    "2. Données collectées",
    "Identité et contact : nom, prénom, adresse email, numéro de téléphone.",
    "Compte utilisateur : identifiants de connexion, progression dans les formations et modules, réponses aux exercices et outils de la Plateforme.",
    "Données commerciales : réponses aux formulaires de candidature ou de qualification, échanges avec notre équipe, historique des rendez-vous et des achats.",
    "Données de paiement : informations de facturation. Les coordonnées bancaires sont traitées directement par notre prestataire de paiement Stripe. ETHICARENA L.L.C-FZ n'y a jamais accès en intégralité.",
    "Données de navigation : adresse IP, type de navigateur et d'appareil, pages consultées, durée des visites, collectées via des cookies et traceurs (voir section 9).",
    "Enregistrements d'appels : lorsqu'un appel de vente ou de coaching est enregistré, vous en êtes informé au préalable et pouvez vous y opposer.",
    "Les données signalées comme obligatoires dans nos formulaires sont nécessaires pour créer votre compte, vous donner accès aux services ou traiter votre commande. Sans elles, nous ne pouvons pas vous fournir le service demandé. Les autres données sont facultatives.",
    "3. Finalités et bases légales",
    "Créer et gérer votre compte, donner accès aux formations et accompagnements : exécution du contrat.",
    "Traiter les paiements et établir les factures : exécution du contrat ; obligation légale.",
    "Répondre à vos demandes et assurer le suivi client : exécution du contrat ; intérêt légitime.",
    "Organiser les rendez-vous et appels de découverte : mesures précontractuelles prises à votre demande.",
    "Envoyer des communications commerciales aux prospects : consentement.",
    "Envoyer des offres similaires à nos clients : intérêt légitime (vous pouvez vous y opposer à tout moment).",
    "Enregistrer des appels à des fins de qualité et de formation de l'équipe : intérêt légitime (vous pouvez vous y opposer).",
    "Mesurer l'audience de la Plateforme : consentement.",
    "Diffuser et mesurer nos publicités : consentement.",
    "Prévenir la fraude et le partage illicite d'accès, faire valoir nos droits : intérêt légitime.",
    "Respecter nos obligations comptables, fiscales et légales : obligation légale.",
    "Chaque email commercial contient un lien de désinscription.",
    "4. Absence de décision automatisée",
    "Aucune décision produisant des effets juridiques à votre égard, ou vous affectant de manière significative, n'est prise sur le seul fondement d'un traitement automatisé, profilage compris.",
    "5. Destinataires des données",
    "Vos données sont accessibles aux membres de l'équipe d'ETHICARENA L.L.C-FZ qui en ont besoin pour leur mission (accompagnement, vente, support). Elles sont aussi traitées par nos sous-traitants, liés par un contrat conforme à l'article 28 du RGPD et agissant uniquement sur nos instructions. Ces sous-traitants se répartissent en plusieurs catégories :",
    "hébergement de la Plateforme : Hostinger International Ltd (Chypre) ;",
    "paiement : Stripe ;",
    "base de données et gestion des comptes utilisateurs ;",
    "emailing et gestion de la relation client ;",
    "prise de rendez-vous et visioconférence ;",
    "espace communautaire en ligne ;",
    "mesure d'audience et régies publicitaires, uniquement avec votre consentement.",
    "La liste nominative de nos sous-traitants est disponible sur simple demande à contact@ethicarena.com.",
    "Nous ne vendons ni ne louons vos données personnelles. Elles peuvent être communiquées aux autorités compétentes lorsque la loi l'impose.",
    "6. Transferts hors de l'Union européenne",
    "ETHICARENA L.L.C-FZ est établie aux Émirats arabes unis, pays qui ne fait pas l'objet d'une décision d'adéquation de la Commission européenne. Certains de nos prestataires sont également situés hors de l'UE, notamment aux États-Unis. Vos données peuvent donc être transférées hors de l'Espace économique européen.",
    "Ces transferts sont encadrés par les garanties prévues aux articles 45 et 46 du RGPD :",
    "le cadre de protection des données UE–États-Unis (Data Privacy Framework), pour les prestataires américains certifiés ;",
    "les clauses contractuelles types adoptées par la Commission européenne, dans les autres cas.",
    "Vous pouvez obtenir une copie de ces garanties en écrivant à contact@ethicarena.com.",
    "7. Durées de conservation",
    "Prospects : 3 ans à compter du dernier contact émanant de vous.",
    "Clients : pendant toute la durée de la relation contractuelle, puis 3 ans à des fins commerciales. Les données utiles à la preuve d'un contrat sont conservées pendant le délai de prescription applicable.",
    "Données de facturation : pendant la durée légale de conservation des documents comptables et fiscaux applicable à ETHICARENA L.L.C-FZ.",
    "Enregistrements d'appels : 6 mois maximum.",
    "Cookies et traceurs : 13 mois maximum. Votre choix (acceptation ou refus) est conservé 6 mois.",
    "Demandes d'exercice de droits : pendant le délai nécessaire pour y répondre et en justifier.",
    "À l'issue de ces durées, les données sont supprimées ou anonymisées de manière irréversible.",
    "8. Vos droits",
    "Conformément aux articles 15 à 22 du RGPD, vous disposez des droits suivants :",
    "droit d'accès et d'obtenir une copie de vos données ;",
    "droit de rectification ;",
    "droit à l'effacement ;",
    "droit à la limitation du traitement ;",
    "droit à la portabilité ;",
    "droit d'opposition, à tout moment, aux traitements fondés sur l'intérêt légitime et à la prospection commerciale ;",
    "droit de retirer votre consentement à tout moment, sans remettre en cause les traitements déjà effectués ;",
    "pour les résidents français, droit de définir des directives relatives au sort de vos données après votre décès.",
    "Pour exercer ces droits, écrivez à contact@ethicarena.com. Nous répondons dans un délai d'un mois, prolongeable de deux mois en cas de demande complexe (vous en serez informé). L'exercice de vos droits est gratuit. Une pièce justificative d'identité ne peut vous être demandée qu'en cas de doute raisonnable sur votre identité.",
    "Vous pouvez introduire une réclamation auprès de l'autorité de contrôle de votre pays de résidence. En France, il s'agit de la CNIL (3 place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 – www.cnil.fr).",
    "9. Cookies et traceurs",
    "La Plateforme utilise trois types de cookies :",
    "Cookies strictement nécessaires : connexion, sécurité, mémorisation de vos choix. Ils sont exemptés de consentement.",
    "Cookies de mesure d'audience : pour comprendre l'utilisation de la Plateforme et l'améliorer.",
    "Cookies publicitaires : pour mesurer l'efficacité de nos publicités et vous proposer des contenus adaptés sur les réseaux sociaux.",
    "Les cookies de mesure d'audience et publicitaires ne sont déposés qu'après votre consentement. Celui-ci est recueilli via le bandeau affiché lors de votre première visite, qui vous permet d'accepter, de refuser ou de personnaliser vos choix aussi facilement les uns que les autres. Refuser n'a aucune incidence sur votre accès à la Plateforme. Vous pouvez modifier vos choix à tout moment via le lien « Gérer les cookies » en bas de page.",
    "10. Mineurs",
    "Les services AL BARAKA sont réservés aux personnes majeures. Nous ne collectons pas sciemment de données concernant des mineurs. Si nous apprenons qu'un mineur nous a transmis des données, nous les supprimons dans les meilleurs délais.",
    "11. Sécurité",
    "Nous mettons en œuvre des mesures techniques et organisationnelles adaptées (article 32 du RGPD) : accès restreints selon les besoins, connexions chiffrées, authentification, prestataires présentant des garanties suffisantes. En cas de violation de données susceptible d'engendrer un risque pour vos droits, nous notifierons l'autorité compétente et, lorsque la loi l'exige, vous en informerons dans les délais prévus par le RGPD.",
    "12. Liens vers des sites tiers",
    "La Plateforme peut contenir des liens vers des sites ou services tiers. Nous ne contrôlons pas ces sites, qui appliquent leurs propres politiques de confidentialité.",
    "13. Modifications",
    "Nous pouvons modifier la présente politique pour tenir compte d'évolutions légales ou de nos services. La date de mise à jour figure en haut de page. En cas de modification importante, nous vous en informerons par email ou via la Plateforme avant son entrée en vigueur.",
    "14. Contact",
    "ETHICARENA L.L.C-FZ – Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubaï, Émirats arabes unis – Email : contact@ethicarena.com",
  ],
};

export const CGV: PageLegale = {
  chemin: "/conditions-generales-de-vente",
  titre: "Conditions générales de vente",
  titreOnglet: "Conditions générales de vente — AL BARAKA",
  dateDeMiseAJour: true,
  lignes: [
    "Article 1 – Identification du vendeur",
    "Les présentes conditions générales de vente (« CGV ») s'appliquent aux ventes conclues avec ETHICARENA L.L.C-FZ, propriétaire et exploitante de la marque et de la plateforme AL BARAKA :",
    "Siège social : Meydan Grandstand, 6th floor, Meydan Road, Nad Al Sheba, Dubaï, Émirats arabes unis",
    "Numéro de licence : 2422583.01",
    "Représentant légal : Sid Ali GHALMI",
    "Email : contact@ethicarena.com",
    "Plateforme : https://plateforme.albarakaecosysteme.com (la « Plateforme »)",
    "Ci-après « ETHICARENA » ou « le Vendeur ».",
    "Article 2 – Champ d'application",
    "2.1. Les présentes CGV s'appliquent à toute commande passée auprès du Vendeur par une personne physique majeure ou une personne morale (le « Client »), quel que soit le canal : Plateforme, lien de paiement, ou commande conclue à la suite d'un échange avec l'équipe AL BARAKA.",
    "2.2. Le Client déclare avoir la capacité juridique de contracter. Les offres AL BARAKA sont réservées aux personnes majeures.",
    "2.3. Les CGV applicables sont celles en vigueur à la date de la commande. Elles sont accessibles à tout moment sur la Plateforme et peuvent être téléchargées ou imprimées. Le Client les accepte expressément en cochant la case prévue à cet effet avant la validation de sa commande.",
    "2.4. Lorsqu'une offre fait l'objet d'un contrat spécifique signé par le Client, les stipulations de ce contrat prévalent sur les présentes CGV en cas de contradiction, sous réserve des droits impératifs dont bénéficie le Client consommateur.",
    "2.5. Les dispositions protectrices des consommateurs prévues par la loi s'appliquent au Client consommateur. Elles s'appliquent aussi au Client professionnel employant cinq salariés au plus, lorsque l'objet du contrat n'entre pas dans le champ de son activité principale.",
    "Article 3 – Objet de la vente",
    "Le Vendeur commercialise un accès à la Plateforme AL BARAKA, dont les contenus et outils sont déverrouillés progressivement selon l'offre souscrite, le projet du Client et les compétences qu'il souhaite développer.",
    "Les contenus accessibles, leur rythme de déverrouillage ainsi que le prix de chaque offre sont présentés sur sa page de présentation et rappelés avant la validation de la commande, conformément aux articles L. 111-1 et L. 221-5 du Code de la consommation.",
    "Article 4 – Résultats non garantis",
    "L'accès à la Plateforme relève d'une obligation de moyens. Il ne garantit aucun résultat, notamment financier. Les résultats dépendent de l'implication du Client, de ses compétences, de sa situation de départ et du contexte de marché. Les éventuelles garanties spécifiques prévues par un contrat signé s'appliquent dans les conditions strictement définies par ce contrat.",
    "Article 5 – Prix",
    "5.1. Les prix sont indiqués en euros. TVA non applicable.",
    "5.2. Le Vendeur peut modifier ses prix à tout moment. Les commandes déjà validées ne sont pas concernées.",
    "5.3. Les éventuels frais bancaires ou de change facturés par la banque du Client restent à sa charge.",
    "Article 6 – Commande",
    "6.1. La commande est passée sur la Plateforme ou via un lien de paiement sécurisé transmis par le Vendeur. Avant de valider, le Client peut vérifier le détail de sa commande et son prix total, et corriger d'éventuelles erreurs.",
    "6.2. La validation de la commande implique une obligation de paiement. Le Vendeur confirme la commande par email. Cet email constitue la confirmation du contrat sur support durable et reprend l'accord du Client pour l'accès immédiat à la Plateforme ainsi que sa renonciation au droit de rétractation (article 10).",
    "6.3. Le Vendeur peut refuser une commande en cas de litige de paiement antérieur avec le Client ou de manquement grave de celui-ci aux présentes CGV.",
    "Article 7 – Paiement",
    "7.1. Le paiement s'effectue exclusivement par carte bancaire, via notre prestataire de paiement sécurisé Stripe. Les données bancaires sont chiffrées et traitées par Stripe. Le Vendeur n'y a jamais accès en intégralité.",
    "7.2. Paiement comptant : sauf mention contraire, le prix est exigible en totalité à la commande.",
    "7.3. Paiement mensuel avec engagement : lorsqu'une offre est proposée sous forme d'abonnement avec durée d'engagement, le Client s'engage à régler chaque mensualité jusqu'au terme de la durée d'engagement indiquée avant la commande.",
    "7.4. Paiement en plusieurs fois : lorsqu'il est proposé, le paiement fractionné est accordé sans frais ni intérêts. L'échéancier (nombre, montants et dates des débits) est communiqué avant la validation de la commande. Les accès à la Plateforme sont déverrouillés au fur et à mesure du règlement des échéances. Le Client autorise le débit automatique de chaque échéance sur la carte bancaire enregistrée.",
    "7.5. Le Client garantit être titulaire du moyen de paiement utilisé ou autorisé à l'utiliser.",
    "Article 8 – Retard ou défaut de paiement",
    "8.1. Aucun intérêt de retard n'est appliqué.",
    "8.2. En cas d'échec d'un paiement, le Client en est informé et dispose d'un délai pour régulariser. À défaut, une mise en demeure lui est adressée par email ou par courrier. Si la somme due n'est pas réglée dans un délai de 15 jours suivant la mise en demeure :",
    "l'accès du Client à la Plateforme peut être suspendu jusqu'à régularisation ;",
    "une indemnité forfaitaire de 50 € correspondant aux frais administratifs de traitement peut être réclamée ;",
    "le Vendeur peut engager toute procédure de recouvrement amiable ou judiciaire des sommes restant dues.",
    "8.3. Les frais de recouvrement restent à la charge du Vendeur, sauf décision de justice contraire.",
    "Article 9 – Accès à la Plateforme",
    "9.1. Ouverture de l'accès : l'accès est ouvert après la validation du paiement ou de la première échéance, au moyen d'identifiants personnels créés par le Client ou transmis par email.",
    "9.2. Durée d'accès : la durée d'accès est indiquée sur la page de chaque offre. À défaut de précision, l'accès est accordé pour la durée de l'offre souscrite.",
    "9.3. Accès personnel : l'accès est strictement personnel, incessible et intransmissible. Le partage des identifiants, la revente ou la diffusion des accès est interdit. En cas de manquement constaté, le Vendeur peut, après une mise en demeure restée sans effet sous 8 jours, suspendre ou résilier l'accès du Client. En cas de manquement grave (revente, diffusion publique des contenus), la suspension peut être immédiate.",
    "9.4. Disponibilité : la Plateforme est accessible 24 h/24 et 7 j/7, sauf maintenance, mise à jour ou incident technique. Le Vendeur s'efforce de rétablir l'accès dans les meilleurs délais.",
    "9.5. Équipement : le Client doit disposer d'un équipement et d'une connexion internet permettant d'utiliser la Plateforme (ordinateur, tablette ou smartphone récent, navigateur à jour).",
    "9.6. Mises à jour : les contenus de la Plateforme peuvent être mis à jour ou enrichis. Le Client accède à la version en vigueur, sans que cela réduise les caractéristiques essentielles de l'offre souscrite.",
    "Article 10 – Renonciation au droit de rétractation – Absence de remboursement",
    "Avant la validation de sa commande, le Client demande expressément l'accès immédiat à la Plateforme et reconnaît renoncer à son droit de rétractation, en cochant la case prévue à cet effet, conformément à l'article L. 221-28 du Code de la consommation. Cette renonciation est également prévue dans son contrat et confirmée dans l'email de confirmation de commande.",
    "En conséquence, aucune rétractation ni aucun remboursement n'est accordé une fois la commande validée et l'accès ouvert, sauf disposition légale impérative contraire.",
    "Article 11 – Garantie légale de conformité",
    "11.1. Le Vendeur est tenu de fournir des contenus et services numériques conformes au contrat. Le Client consommateur bénéficie de la garantie légale de conformité prévue aux articles L. 224-25-1 et suivants du Code de la consommation.",
    "11.2. En cas de défaut de conformité, le Client peut obtenir la mise en conformité du contenu ou du service. À défaut, il peut obtenir une réduction du prix ou la résolution du contrat, dans les conditions prévues par la loi. Pour une fourniture continue (abonnement, accès sur une durée), la garantie s'applique pendant toute la durée de fourniture.",
    "11.3. Pour signaler un défaut, le Client écrit à contact@ethicarena.com en décrivant le problème rencontré.",
    "Article 12 – Propriété intellectuelle et confidentialité",
    "12.1. L'ensemble des contenus de la Plateforme (vidéos, textes, méthodes, outils, modules, visuels, marque AL BARAKA) est la propriété exclusive d'ETHICARENA L.L.C-FZ.",
    "12.2. L'accès confère au Client un droit d'usage personnel, non exclusif et non transférable, limité à ses besoins propres et à la durée d'accès prévue. Toute reproduction, diffusion, revente, mise à disposition de tiers ou exploitation commerciale des contenus, totale ou partielle, est interdite sans autorisation écrite du Vendeur.",
    "12.3. Le Client s'engage à ne pas divulguer à des tiers les contenus et supports réservés aux membres.",
    "Article 13 – Obligations du Client",
    "Le Client s'engage à :",
    "fournir des informations exactes lors de sa commande et les tenir à jour ;",
    "utiliser la Plateforme dans le respect des lois en vigueur et des droits des tiers ;",
    "respecter les règles de courtoisie dans l'espace communautaire et dans ses échanges avec les autres membres et l'équipe. Le harcèlement, les propos haineux, la sollicitation commerciale non autorisée des membres et toute manipulation d'autrui sont interdits ;",
    "accomplir lui-même les formalités administratives, fiscales et sociales liées à sa propre activité ;",
    "sauvegarder, s'il le souhaite, les documents mis à sa disposition.",
    "En cas de manquement grave à ces obligations, le Vendeur peut, après mise en demeure restée sans effet, suspendre ou résilier l'accès du Client à l'espace communautaire ou à la Plateforme. Si le manquement le justifie, la suspension peut être immédiate.",
    "Article 14 – Responsabilité",
    "14.1. Le Vendeur est responsable de la bonne exécution de ses obligations, dans les conditions prévues par la loi.",
    "14.2. Sa responsabilité ne peut être engagée en cas de force majeure, de fait d'un tiers, ou de mauvaise utilisation de la Plateforme par le Client. Elle ne peut pas non plus l'être pour les décisions que le Client prend dans le cadre de sa propre activité.",
    "14.3. Le Client est responsable des dommages qu'il cause au Vendeur ou aux tiers par la violation de ses obligations au titre des présentes CGV.",
    "14.4. Aucune stipulation des présentes ne limite la responsabilité du Vendeur au-delà de ce que permet la loi applicable aux consommateurs.",
    "Article 15 – Données personnelles",
    "Les données personnelles du Client sont traitées conformément à notre Politique de confidentialité, accessible sur la Plateforme.",
    "Article 16 – Service client et réclamations",
    "Pour toute question ou réclamation : contact@ethicarena.com. Le Vendeur s'engage à répondre dans les meilleurs délais.",
    "Article 17 – Droit applicable et juridiction",
    "17.1. Les présentes CGV sont soumises au droit français. Le Client consommateur conserve en tout état de cause le bénéfice des dispositions impératives de la loi de son pays de résidence habituelle (article 6 du Règlement (CE) n° 593/2008 « Rome I »).",
    "17.2. En cas de litige, les parties rechercheront d'abord une solution amiable. À défaut, le Client consommateur peut saisir, à son choix, la juridiction du lieu où il demeurait au moment de la conclusion du contrat ou celle du lieu de survenance du fait dommageable. Pour les Clients professionnels, les tribunaux de Paris sont compétents.",
    "Article 18 – Divers",
    "Si une clause des présentes CGV était déclarée nulle, les autres clauses resteraient en vigueur. Le fait pour le Vendeur de ne pas se prévaloir d'une clause ne vaut pas renonciation à s'en prévaloir ultérieurement.",
  ],
};

export const PAGES_LEGALES: PageLegale[] = [
  MENTIONS_LEGALES,
  POLITIQUE_CONFIDENTIALITE,
  CGV,
];
