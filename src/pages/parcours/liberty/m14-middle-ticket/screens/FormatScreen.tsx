import { ArrowLeft, ArrowRight } from "lucide-react";
import { Btn, TextArea } from "../../m1-niche/components/ui";
import { UpstreamContext } from "../components/UpstreamContext";
import { type M14State, FORMATS, FORMAT_KEYS, MATRICE_CRITERES, TRACE_MIN_LENGTH, type FormatKey } from "../lib/types";
import { recommanderFormat, countFormatsExplores, detectGenericTraps, canEnterArchitecture, missingFieldsLabel } from "../lib/validations";

interface Props { state: M14State; setState: (n: (p: M14State) => M14State) => void; onBack: () => void; onNext: () => void; }

export function FormatScreen({ state, setState, onBack, onNext }: Props) {
  const d = state.data;
  const locked = state.signed;
  const explored = d.formats_explores || [];
  const choisi = d.format_choisi || "";
  const reco = recommanderFormat(d.matrice_reponses || ({} as any));
  const nbExp = countFormatsExplores(d);
  const justification = d.format_justification || "";
  const traps = detectGenericTraps(justification);
  const jaugeClass = nbExp >= 3 ? "good" : nbExp >= 2 ? "warn" : "bad";
  const canNext = canEnterArchitecture(state);

  const pickFormat = (k: FormatKey) => {
    if (locked) return;
    setState((prev) => {
      const arr = [...(prev.data.formats_explores || [])];
      if (!arr.includes(k)) arr.push(k);
      return { ...prev, data: { ...prev.data, formats_explores: arr, format_choisi: k } };
    });
  };
  const setMatrice = (id: string, value: string) => {
    if (locked) return;
    setState((prev) => ({ ...prev, data: { ...prev.data, matrice_reponses: { ...prev.data.matrice_reponses, [id]: value } } }));
  };
  const setJustif = (val: string) => setState((prev) => ({ ...prev, data: { ...prev.data, format_justification: val } }));

  const jaugeColor = jaugeClass === "good" ? "#4cc987" : jaugeClass === "warn" ? "#c98a4c" : "#c94c4c";

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-serif text-[20px] font-semibold italic text-[#C9A84C]">01</span>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-white">Choisir LE format de ton Middle-Ticket</h2>
      </div>
      <p className="mb-5 text-[13px] leading-[1.65] text-white/60">
        Il existe 4 formats possibles pour un MT — chacun a une plage de prix, un type d'engagement, et un profil d'avatar qui lui correspond. Tu vas explorer les 4, répondre à 3 critères de matrice de décision, puis trancher avec une justification concrète. <em className="text-white/45">Compte 8 à 12 minutes.</em>
      </p>

      <div className="mb-5 rounded-xl p-4" style={{ background: "rgba(201,168,76,0.04)", border: "0.5px solid rgba(201,168,76,0.18)" }}>
        <h4 className="mb-2 text-[13px] font-semibold text-[#C9A84C]">Pourquoi tu dois explorer les 4 formats avant de choisir</h4>
        <p className="text-[13px] leading-[1.6] text-white/75">
          Beaucoup d'élèves choisissent le format par défaut — celui qu'ils ont vu sur le marché ou celui qui leur semble « le plus pro ». Résultat : ils se retrouvent avec un programme de groupe alors qu'ils n'ont pas le temps d'animer un call hebdo, ou avec une formation pure alors que leur niche a besoin de lien humain. Avant de trancher, tu lis les 4 cartes en notant pour chacune <strong className="text-white">pourquoi elle ne te conviendrait pas</strong>. C'est en éliminant que tu choisis bien.
        </p>
      </div>

      <UpstreamContext state={state} />

      <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">Les 4 formats — clique sur chacun pour le marquer comme exploré, puis sélectionne ton choix final</div>
      <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
        {FORMAT_KEYS.map((k) => {
          const f = FORMATS[k];
          const isChoisi = choisi === k;
          const isExplored = explored.includes(k);
          return (
            <button key={k} type="button" onClick={() => pickFormat(k)} disabled={locked} className="rounded-xl p-4 text-left transition-all disabled:cursor-default"
              style={{ background: isChoisi ? "#2A2310" : "#14130E", border: "1px solid " + (isChoisi ? "#C9A84C" : isExplored ? "rgba(76,201,135,0.5)" : "rgba(201,168,76,0.18)") }}>
              <h3 className="text-[14px] font-semibold text-white">{f.label}{isExplored && !isChoisi ? <span className="ml-2 text-[10px] text-[#4cc987]">✓ exploré</span> : null}{isChoisi ? <span className="ml-2 text-[10px] text-[#C9A84C]">● choisi</span> : null}</h3>
              <div className="mt-0.5 text-[12px] font-medium text-[#C9A84C]">{f.range}</div>
              <div className="mt-2 text-[12px] leading-[1.5] text-white/65">{f.desc}</div>
              <div className="mt-2 text-[12px] leading-[1.5] text-white/70"><b className="text-white/90">Quand choisir ce format :</b> {f.quand}</div>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex items-center gap-3 rounded-[10px] px-4 py-3" style={{ background: "#181612", border: "1px solid " + jaugeColor + "55" }}>
        <span className="font-serif text-[18px] font-semibold" style={{ color: jaugeColor }}>{nbExp}/4</span>
        <span className="text-[12px] leading-[1.4] text-white/60">
          {nbExp >= 3 ? (
            <>Tu as exploré assez de formats pour trancher en connaissance de cause. {choisi ? <>Ton choix : <b className="text-white/90">{FORMATS[choisi as FormatKey]?.label}</b>.</> : <>Sélectionne maintenant celui qui te convient.</>}</>
          ) : (
            <>Tu dois explorer au moins 3 formats sur 4 avant de pouvoir choisir le tien (gate de diversité).</>
          )}
        </span>
      </div>

      <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">Matrice de décision — 3 critères pour t'orienter</div>
      <div className="mb-4 space-y-3">
        {MATRICE_CRITERES.map((crit, i) => {
          const choix = (d.matrice_reponses || ({} as any))[crit.id] || "";
          return (
            <div key={crit.id} className="rounded-xl p-4" style={{ background: "#14130E", border: "0.5px solid rgba(201,168,76,0.18)" }}>
              <div className="mb-2 flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#080808]" style={{ background: "#C9A84C" }}>{i + 1}</span>
                <span className="text-[13px] font-medium leading-[1.45] text-white/85">{crit.question}</span>
              </div>
              <div className="space-y-1.5">
                {crit.options.map((opt) => {
                  const sel = choix === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setMatrice(crit.id, opt.value)} disabled={locked} className="flex w-full items-start gap-2.5 rounded-[8px] px-3 py-2 text-left text-[12.5px] transition-all disabled:cursor-default"
                      style={{ background: sel ? "#2A2310" : "#0F0E0A", border: "1px solid " + (sel ? "#C9A84C" : "rgba(201,168,76,0.14)"), color: sel ? "#fff" : "rgba(255,255,255,0.7)" }}>
                      <span className="mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full" style={{ border: "1.5px solid " + (sel ? "#C9A84C" : "rgba(201,168,76,0.4)") }}>{sel && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#C9A84C" }} />}</span>
                      <span className="flex-1 leading-[1.4]">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {reco.total_answered >= 2 && reco.format && !reco.ambiguous ? (
        <div className="mb-5 rounded-xl p-4" style={{ background: "rgba(76,201,135,0.06)", border: "0.5px solid rgba(76,201,135,0.4)" }}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4cc987]">Format suggéré par la matrice ({reco.total_answered}/3 critères répondus)</div>
          <div className="mt-1 text-[16px] font-semibold text-white">{FORMATS[reco.format as FormatKey]?.label}</div>
          <div className="mt-2 text-[12.5px] leading-[1.5] text-white/70">D'après tes réponses, ce format est celui qui colle le mieux à ton temps disponible, à ta niche et à la cadence dont tes prospects ont besoin. Mais c'est une suggestion, pas une obligation — tu peux choisir un autre format si tu as une bonne raison concrète, à condition de l'écrire dans la justification.</div>
        </div>
      ) : reco.ambiguous ? (
        <div className="mb-5 rounded-xl px-4 py-3 text-[12.5px] leading-[1.5] text-white/70" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)" }}>
          <b className="text-white/90">Pas de dominance claire sur ta matrice.</b> Tes réponses pointent vers plusieurs formats à égalité — c'est probablement le signe que ton avatar a des besoins hybrides ou que tu hésites encore entre deux usages. Choisis le format qui correspond le mieux à ce que tu sais déjà bien faire, et explicite ton hésitation dans la justification.
        </div>
      ) : reco.total_answered >= 1 ? (
        <div className="mb-5 rounded-xl px-4 py-3 text-[12.5px] leading-[1.5] text-white/70" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)" }}>
          Réponds aux 3 critères de la matrice pour obtenir une suggestion de format claire.
        </div>
      ) : null}

      <div className="mb-2">
        <label className="text-[13px] font-medium text-white/85">Justifie ton choix de format en quelques phrases concrètes <span className="text-white/40">(minimum {TRACE_MIN_LENGTH} caractères — ne tombe pas dans le générique)</span></label>
      </div>
      <TextArea value={justification} onChange={(e) => setJustif(e.target.value)} rows={3} disabled={locked}
        placeholder="Ex : « Mes mères ont besoin du call hebdo pour rompre l'isolement du foyer et oser parler de leur activité — sans ce lien, 80% abandonnent au 2e module faute d'accountability. »" />

      {traps.length > 0 && (
        <div className="mt-3 rounded-xl px-4 py-2.5 text-[12px] leading-[1.5]" style={{ background: "rgba(232,107,107,0.08)", border: "0.5px solid rgba(232,107,107,0.4)", color: "#e8a0a0" }}>
          <b>Attention aux mots-pièges génériques :</b> {traps.map((t) => "« " + t + " »").join(", ")} — ces mots sonnent creux et ne disent rien de concret sur ton choix. Décris plutôt ce que ton avatar fera concrètement avec ce format.
        </div>
      )}
      {!canNext && (
        <div className="mt-3 rounded-xl px-4 py-2.5 text-[12px] leading-[1.5] text-white/70" style={{ background: "rgba(201,138,76,0.06)", border: "0.5px solid rgba(201,138,76,0.3)" }}>
          <b className="text-white/90">Pour avancer, il te manque :</b> {missingFieldsLabel("architecture", state)}.
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Welcome</Btn>
        <Btn variant="primary" disabled={!canNext} onClick={() => canNext && onNext()}>Passer à l'architecture <ArrowRight className="h-4 w-4" /></Btn>
      </div>
    </div>
  );
}
