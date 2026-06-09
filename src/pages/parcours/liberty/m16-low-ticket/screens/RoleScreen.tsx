import { Card, Eyebrow, HStep, Lead, Peda, NavBtns } from "../components/parts";

export function RoleScreen({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <Card>
      <Eyebrow>Étape 1</Eyebrow>
      <HStep>Le rôle de ton Low-Ticket</HStep>
      <Lead>Avant de le construire, comprends à quoi il sert vraiment. Sinon tu vas le rater.</Lead>
      <Peda><b className="text-[#C9A84C]">Ce n'est PAS un produit pour gagner de l'argent.</b> C'est un outil d'acquisition. Son vrai rôle : provoquer la première transaction. Quand quelqu'un sort sa carte, même pour 17€, il change de statut — il passe de « visiteur » à « client ». Et un client à 17€ a dix fois plus de chances d'acheter ton offre principale qu'un inconnu.</Peda>
      <Peda><b className="text-[#C9A84C]">La règle d'or :</b> ton produit doit être la <i>première marche évidente</i> vers ton offre principale. S'il résout un problème sans lien, ton client n'aura aucune raison de monter d'un cran. On va verrouiller ce lien à l'étape Promesse.</Peda>
      <NavBtns onBack={onBack} onNext={onNext} nextLabel="J'ai compris →" />
    </Card>
  );
}
