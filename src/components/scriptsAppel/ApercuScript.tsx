import { AlertTriangle, Mic } from "lucide-react";
import logo from "@/assets/scripts-appel/logo-al-baraka-or.png";
import {
  reponseListe, reponseTexte, segmenter,
  type Bloc, type DefinitionScript, type Reponses,
} from "@/lib/scriptsAppel";

/** Aperçu en direct, sur fond blanc comme le document final. */
export function ApercuScript({ def, reponses, projet, champActif }: {
  def: DefinitionScript; reponses: Reponses; projet: string; champActif?: string | null;
}) {
  return (
    <div className="rounded-lg bg-white text-[#1F1F1F] shadow-sm px-6 py-6 font-serif text-[13.5px] leading-relaxed" data-testid="apercu-script">
      <img src={logo} alt="AL BARAKA" className="h-12 w-auto mb-2" />
      <h1 className="text-2xl font-bold leading-tight">Script — {def.titre}</h1>
      <p className="text-[#5A5A5A] border-b border-[#C9A84C] pb-1.5 mb-3">{projet ? `${projet} · ${def.sousTitre}` : def.sousTitre}</p>
      {def.blocs.map((b, i) => <BlocApercu key={i} b={b} def={def} rep={reponses} actif={champActif} />)}
    </div>
  );
}

function Morceaux({ texte, def, rep, actif }: { texte: string; def: DefinitionScript; rep: Reponses; actif?: string | null }) {
  return (
    <>
      {segmenter(texte, rep, def.champs).map((seg, i) => {
        if (!seg.champ) return <span key={i}>{seg.texte}</span>;
        const classe = seg.vide
          ? "rounded bg-amber-100 px-1 text-amber-700"
          : "rounded bg-emerald-50 px-0.5 text-[#1F1F1F]";
        return (
          <span key={i} data-champ={seg.champ} className={`${classe} ${actif === seg.champ ? "ring-2 ring-amber-400" : ""}`}>
            {seg.texte}
          </span>
        );
      })}
    </>
  );
}

function Pointilles({ n, id, actif }: { n: number; id?: string; actif?: string | null }) {
  return (
    <div className={`my-1 rounded ${id ? "bg-amber-50" : ""} ${id && actif === id ? "ring-2 ring-amber-400" : ""}`} data-champ={id}>
      {Array.from({ length: Math.max(n, 1) }, (_, i) => <div key={i} className="h-5 border-b border-dotted border-[#BBBBBB]" />)}
      {id && <p className="text-[11px] text-amber-700 px-1 py-0.5">À compléter</p>}
    </div>
  );
}

function BlocApercu({ b, def, rep, actif }: { b: Bloc; def: DefinitionScript; rep: Reponses; actif?: string | null }) {
  const m = (t: string) => <Morceaux texte={t} def={def} rep={rep} actif={actif} />;
  switch (b.t) {
    case "titre":
      return <h2 className="mt-5 mb-1.5 border-b border-[#C9A84C] pb-0.5 text-lg font-bold text-[#9A740B]">{b.texte}</h2>;
    case "texte":
      return <p className="mb-1.5">{m(b.texte)}</p>;
    case "citation":
      return <p className="mb-1 ml-4 italic text-[#9A740B]">{b.texte}</p>;
    case "alerte":
      return <p className="my-1.5 flex gap-1.5 font-bold"><AlertTriangle className="h-4 w-4 shrink-0 text-[#B02A2A] mt-0.5" />{m(b.texte)}</p>;
    case "voix":
      return (
        <p className="mt-2.5 mb-0.5 flex items-center gap-1 text-xs">
          <Mic className="h-3.5 w-3.5 text-[#9A740B]" />
          <span className="font-bold text-[#9A740B]">{b.nom}</span>
          <span className="italic text-[#5A5A5A]">{b.ton}</span>
        </p>
      );
    case "replique":
      return <p className="mb-2 ml-2 border-l-[3px] border-[#C9A84C] bg-[#FBF7EC] px-3 py-1">{m(b.texte)}</p>;
    case "note":
      return <p className="mb-1.5 ml-2 text-[12.5px] italic text-[#5A5A5A]">{m(b.texte)}</p>;
    case "puce":
      return <p className="mb-1 ml-4 flex gap-2"><span className="font-bold text-[#9A740B]">•</span><span>{m(b.texte)}</span></p>;
    case "etiquette":
      return <p className="mt-3 mb-1 text-[13px] font-bold text-[#9A740B]">{m(b.texte)}</p>;
    case "lignes":
      return <Pointilles n={b.n} />;
    case "champ": {
      const champ = def.champs.find((c) => c.id === b.id);
      if (champ?.type === "liste") {
        const items = reponseListe(rep, b.id);
        if (!items.length) return <Pointilles n={Math.min(b.lignes, 3)} id={b.id} actif={actif} />;
        return (
          <div data-champ={b.id} className={actif === b.id ? "rounded ring-2 ring-amber-400" : ""}>
            {items.map((l, i) => <p key={i} className="mb-1 ml-4 flex gap-2"><span className="font-bold text-[#9A740B]">•</span><span>{l}</span></p>)}
          </div>
        );
      }
      const v = reponseTexte(rep, b.id);
      if (!v) return champ?.facultatif ? null : <Pointilles n={Math.min(b.lignes, 3)} id={b.id} actif={actif} />;
      return (
        <div data-champ={b.id} className={actif === b.id ? "rounded ring-2 ring-amber-400" : ""}>
          {v.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l, i) => (
            <p key={i} className="mb-2 ml-2 border-l-[3px] border-[#C9A84C] bg-[#FBF7EC] px-3 py-1">{l}</p>
          ))}
        </div>
      );
    }
  }
}
