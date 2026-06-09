import { ArrowRight, PlayCircle } from "lucide-react";
import { UpstreamContext } from "../components/UpstreamContext";
import { type M14State } from "../lib/types";

interface Props { state: M14State; onStart: () => void; onOpenDemo: () => void; }

function PedaBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-xl p-4" style={{ background: "rgba(201,168,76,0.04)", border: "0.5px solid rgba(201,168,76,0.18)" }}>
      <h4 className="mb-2 text-[13px] font-semibold text-[#C9A84C]">{title}</h4>
      {children}
    </div>
  );
}

export function WelcomeScreen({ state, onStart, onOpenDemo }: Props) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-serif text-[20px] font-semibold italic text-[#C9A84C]">00</span>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-white">Bienvenue dans l'architecture de ton Middle-Ticket</h2>
      </div>
      <p className="mb-6 text-[13px] leading-[1.65] text-white/60">
        Tu vas transformer ton accompagnement High-Ticket en un produit packagé à prix accessible, sans refaire la conception pédagogique de zéro. C'est un dégraissage stratégique de ce qui existe déjà — pas un nouveau programme.
      </p>

      <PedaBox title="Pourquoi le Middle-Ticket est ton vrai moteur de profit">
        <p className="mb-3 text-[13px] leading-[1.6] text-white/75">
          Ton High-Ticket a posé les fondations : la promesse, le programme, l'accountability. Mais il a une limite structurelle — tu ne peux pas le scaler à grande échelle, parce qu'il consomme ton temps. Le Middle-Ticket résout exactement ce problème : tu prends 80% de la valeur du HT, tu enlèves ce qui demande ton 1-to-1, et tu le vends à un prix accessible à 5 à 10 fois plus de prospects. C'est ce produit qui finance ton acquisition, qui prouve ta valeur à grande échelle, et qui te ramène les 20% les plus engagés vers ton HT.
        </p>
        <p className="mb-3 text-[13px] leading-[1.6] italic text-[#C9A84C]">
          Le Middle-Ticket n'est pas un mini High-Ticket. C'est ton High-Ticket dégraissé, packagé, scalable.
        </p>
        <p className="text-[13px] leading-[1.6] text-white/75">
          La règle d'or : ton MT doit livrer la même <strong className="text-white">promesse de transformation</strong> que ton HT, mais avec moins d'accompagnement. Le contenu vidéo reste le même. Ce qui disparaît, c'est le coaching personnalisé, les corrections individuelles, les calls 1-to-1 — tout ce qui consomme ton temps de manière non-scalable.
        </p>
      </PedaBox>

      <PedaBox title="Ce que tu vas faire ici, en 3 étapes + un livrable">
        <p className="text-[13px] leading-[1.6] text-white/75">
          D'abord, tu vas <strong className="text-white">choisir LE format MT</strong> qui colle à ta niche : formation pure, programme de groupe, masterclass intensive ou membership. Tu vas explorer les 4 et trancher avec une matrice de décision en 3 critères. Ensuite, tu vas <strong className="text-white">valider l'architecture des modules MT</strong> : l'outil te propose automatiquement, pour chaque module de ton HT, une décision (garder / adapter / retirer) avec une suggestion d'adaptation pré-écrite selon le format choisi — tu valides ou tu ajustes. Puis tu vas <strong className="text-white">fixer ton prix MT</strong> en respectant 3 garde-fous (ratio HT/MT entre 1/10 et 1/3, plancher 197 €, valeur perçue ≥ 5× le prix). À la fin, tu télécharges un <strong className="text-white">mémo PDF complet</strong> : architecture, prix, justifications, consignes de lancement — à garder pour toi ou à montrer à ton coach.
        </p>
      </PedaBox>

      <UpstreamContext state={state} />

      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={onStart} className="rounded-xl p-5 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#14130E", border: "1px solid rgba(201,168,76,0.3)" }}>
          <h3 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-white"><ArrowRight className="h-4 w-4 text-[#C9A84C]" /> Architecturer mon Middle-Ticket</h3>
          <p className="text-[12.5px] leading-[1.55] text-white/60">Je pars de mon HT et je le dégraisse étape par étape. Tout est sauvegardé automatiquement — je peux interrompre et reprendre à tout moment.</p>
        </button>
        <button type="button" onClick={onOpenDemo} className="rounded-xl p-5 text-left transition-all hover:border-[#C9A84C]" style={{ background: "#14130E", border: "1px solid rgba(201,168,76,0.18)" }}>
          <h3 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-white"><PlayCircle className="h-4 w-4 text-[#C9A84C]" /> Explorer les démos</h3>
          <p className="text-[12.5px] leading-[1.55] text-white/60">10 cas pré-remplis du casting (Aïcha, Karim, Sofia, Mehdi, Yacine, Nora, Tarik, Lina, Adam, Sara) — chaque format MT illustré avec un calendrier de lancement complet. Aucune écriture sur ton profil.</p>
        </button>
      </div>
    </div>
  );
}
