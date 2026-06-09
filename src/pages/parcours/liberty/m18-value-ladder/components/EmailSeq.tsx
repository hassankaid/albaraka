import { type M18State } from "../lib/types";
import { effectiveEmails } from "../lib/emails";

interface Props {
  state: M18State;
  setState: (n: (p: M18State) => M18State) => void;
  seqKey: "lt_mt" | "mt_ht";
  title: string;
  toast: (m: string) => void;
}

function copyText(text: string, ok: string, toast: (m: string) => void) {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(() => toast(ok)).catch(() => toast("Copie impossible — sélectionne le texte manuellement."));
  else toast("Copie impossible — sélectionne le texte manuellement.");
}

export function EmailSeq({ state, setState, seqKey, title, toast }: Props) {
  const emails = effectiveEmails(state, seqKey);
  if (!emails.length) return null;

  const setEmailField = (idx: number, field: "objet" | "corps", val: string) => {
    setState((prev) => {
      const emailsState = { lt_mt: [...(prev.data.emails.lt_mt || [])], mt_ht: [...(prev.data.emails.mt_ht || [])] };
      const arr = [...emailsState[seqKey]];
      arr[idx] = { ...(arr[idx] || {}), [field]: val };
      emailsState[seqKey] = arr;
      return { ...prev, data: { ...prev.data, emails: emailsState } };
    });
  };
  const regenerate = () => {
    setState((prev) => ({ ...prev, data: { ...prev.data, emails: { ...prev.data.emails, [seqKey]: [] } } }));
    toast("Emails régénérés à partir de ta niche.");
  };
  const emailToText = (e: { objet: string; corps: string }) => "Objet : " + e.objet + "\n\n" + e.corps;
  const copyEmail = (i: number) => copyText(emailToText(emails[i]), "Email copié.", toast);
  const copyAll = () => copyText(emails.map((e, i) => "======== EMAIL " + (i + 1) + " · " + e.jour + " ========\n" + emailToText(e)).join("\n\n\n"), "Séquence complète copiée.", toast);

  return (
    <div className="my-4 rounded-xl p-4" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a" }}>
      <div className="mb-3">
        <div className="text-[14px] font-semibold text-[#C9A84C]">✦ {title}</div>
        <div className="text-[11.5px] text-white/40">{emails.length} emails · modifiables, enregistrés automatiquement · [prénom] et [lien] = champs de fusion</div>
      </div>
      <div className="space-y-3">
        {emails.map((e, i) => (
          <div key={i} className="rounded-[10px] p-3" style={{ background: "#181818", border: "1px solid #2a2a2a" }}>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#C9A84C]">{e.jour}</span>
              {e.edited && <span className="text-[11px] italic text-white/40">✎ modifié</span>}
            </div>
            <label className="mb-1 block text-[11px] text-white/40">Objet</label>
            <input value={e.objet} onChange={(ev) => setEmailField(i, "objet", ev.target.value)} className="mb-2 w-full rounded-[8px] px-2.5 py-2 text-[13px] outline-none focus:border-[#C9A84C]" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a", color: "#f5f5f5" }} />
            <label className="mb-1 block text-[11px] text-white/40">Corps de l’email</label>
            <textarea value={e.corps} onChange={(ev) => setEmailField(i, "corps", ev.target.value)} rows={10} className="w-full resize-y rounded-[8px] px-2.5 py-2 text-[12.5px] leading-[1.45] outline-none focus:border-[#C9A84C]" style={{ background: "#0c0c0c", border: "1px solid #2a2a2a", color: "#f5f5f5" }} />
            <div className="mt-1.5">
              <button type="button" onClick={() => copyEmail(i)} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>⧉ Copier cet email</button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={copyAll} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>⧉ Copier toute la séquence</button>
        <button type="button" onClick={regenerate} className="rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: "rgba(201,168,76,0.06)", border: "1px solid rgba(201,168,76,0.4)", color: "#C9A84C" }}>↻ Régénérer (efface mes retouches)</button>
      </div>
    </div>
  );
}
