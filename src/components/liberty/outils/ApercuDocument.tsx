/** Aperçu du document d'un outil Liberty, à l'écran, comme il sera imprimé. */
import { A_COMPLETER, type BlocDoc, type DefinitionOutil, type DocumentOutil } from "@/lib/liberty/outils";
import { RAPPEL_VALIDATION } from "@/lib/liberty/outils/docx";

function Valeur({ v }: { v: string }) {
  return v.trim() ? <span className="whitespace-pre-line">{v.trim()}</span> : <span className="italic text-neutral-400">{A_COMPLETER}</span>;
}

function Bloc({ b }: { b: BlocDoc }) {
  switch (b.t) {
    case "champ":
      return <p className="mb-1.5"><span className="font-semibold">{b.libelle} : </span><Valeur v={b.valeur} /></p>;
    case "phrase":
      return (
        <div className="mb-2.5">
          {b.libelle && <p className="text-[11px] font-semibold text-[#B8963E]">{b.libelle}</p>}
          <p className="border-l-[3px] border-[#B8963E] bg-[#FBF7EC] px-2.5 py-1.5 text-[13px]"><Valeur v={b.valeur} /></p>
        </div>
      );
    case "liste": {
      const items = b.items.length ? b.items : [""];
      return (
        <div className="mb-2">
          {b.libelle && <p className="font-semibold">{b.libelle} :</p>}
          <ul className="ml-3 space-y-0.5">
            {items.map((i, k) => <li key={k} className="flex gap-1.5"><span className="font-bold text-[#B8963E]">•</span><Valeur v={i} /></li>)}
          </ul>
        </div>
      );
    }
    case "tableau": {
      const lignes = b.lignes.length ? b.lignes : [b.colonnes.map(() => "")];
      return (
        <div className="mb-2.5 overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead><tr>{b.colonnes.map((c) => <th key={c} className="border border-[#D9CDB0] bg-[#FBF7EC] px-1.5 py-1 text-left">{c}</th>)}</tr></thead>
            <tbody>{lignes.map((l, i) => <tr key={i}>{l.map((c, k) => <td key={k} className="border border-[#D9CDB0] px-1.5 py-1 align-top"><Valeur v={c} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    case "texte":
      return <p className="mb-1.5">{b.texte}</p>;
    case "saut":
      return <hr className="my-3 border-dashed border-neutral-300" />;
  }
}

export function ApercuDocument({ def, document: d, eleve }: { def: DefinitionOutil; document: DocumentOutil; eleve: string }) {
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="rounded-md bg-white p-5 font-sans text-[12px] leading-relaxed text-neutral-900 shadow-sm" data-testid="apercu-document">
      <p className="text-[10px] font-bold uppercase tracking-widest text-[#B8963E]">Parcours Liberty · {def.etape}</p>
      <h2 className="text-lg font-bold">{d.titre}</h2>
      <p className="mb-3 border-b border-[#B8963E] pb-1.5 text-[11px] text-neutral-500">
        Outil {def.numero} — {def.nom} · {eleve || "Élève"} · {date}
      </p>
      {d.sections.map((s) => (
        <section key={s.titre} className="mb-2">
          <h3 className="mb-1.5 mt-3 text-[12px] font-bold uppercase tracking-wide text-[#B8963E]">{s.titre}</h3>
          {s.blocs.map((b, i) => <Bloc key={i} b={b} />)}
        </section>
      ))}
      <p className="mt-4 border-t border-[#B8963E] pt-2 font-semibold">{RAPPEL_VALIDATION}</p>
    </div>
  );
}
