import { useEffect, type ReactNode } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, X, Lock } from "lucide-react";
import { StepEyebrow, StepTitle, StepSub, Card, Btn, Actions, TextArea } from "../../m1-niche/components/ui";
import {
  type M11State, type Module, type Lecon, type BloomKey, type ExerciceKey, type AccValidationKey,
  BLOOM_LEVELS, BLOOM_RECOMMENDED_BY_TIER, EXERCICE_TYPES, ACCOUNTABILITY_VALIDATION,
  MIN_LECONS, MAX_LECONS, freshLecon,
} from "../lib/types";
import {
  getBloomOptionsForTier, isModuleFicheComplete, validateObjectifMesurable,
  canEnterLockStep, missingFieldsLabel, analyzeBloomCoherence,
} from "../lib/validations";

interface Props { state: M11State; setState: (n: (p: M11State) => M11State) => void; onBack: () => void; onNext: () => void; }

function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="mb-2 block">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#C9A84C]">{children}</span>
      {hint && <span className="ml-2 text-[10px] normal-case tracking-normal text-white/35">{hint}</span>}
    </label>
  );
}
function RadioCard({ selected, onClick, label, meta, badge }: { selected: boolean; onClick: () => void; label: ReactNode; meta: string; badge?: string }) {
  return (
    <button type="button" onClick={onClick} className="rounded-[10px] px-3 py-2.5 text-left transition-all" style={{ background: selected ? "#2A2310" : "#14130E", border: selected ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)" }}>
      <div className="text-[12.5px] font-semibold text-white">{label}{badge && <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>{badge}</span>}</div>
      <div className="mt-0.5 text-[10.5px] leading-[1.4] text-white/45">{meta}</div>
    </button>
  );
}
const inputCls = "w-full rounded-[8px] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30";
const inputStyle = { background: "#0C0B08", border: "1px solid rgba(201,168,76,0.18)" } as const;

export function ModuleFichesScreen({ state, setState, onBack, onNext }: Props) {
  const mods = state.data.modules || [];
  let idx = state._activeFicheIdx || 0;
  if (idx < 0 || idx >= mods.length) idx = 0;
  const tier = state.data.tier_bloom_target || "ht";
  const bloomKeys = getBloomOptionsForTier(tier);
  const bloomReco = BLOOM_RECOMMENDED_BY_TIER[tier as keyof typeof BLOOM_RECOMMENDED_BY_TIER];
  const coh = analyzeBloomCoherence(state.data);
  const lockReady = canEnterLockStep(state.data);

  // ensureMinLecons sur le module actif
  useEffect(() => {
    setState((prev) => {
      const m = prev.data.modules[idx];
      if (!m) return prev;
      const lecons = Array.isArray(m.lecons) ? [...m.lecons] : [];
      if (lecons.length >= MIN_LECONS) return prev;
      while (lecons.length < MIN_LECONS) { const nv = freshLecon(); nv.id = "lec_" + Date.now().toString(36) + "_" + lecons.length + "_" + Math.round(Math.random() * 1e4); lecons.push(nv); }
      const modules = prev.data.modules.map((mm, k) => (k === idx ? { ...mm, lecons } : mm));
      return { ...prev, data: { ...prev.data, modules } };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  if (mods.length === 0) {
    return (
      <div>
        <StepTitle>Fiches modules</StepTitle>
        <Card className="mb-4"><p className="text-[13px] text-white/60">Pas de modules — reviens d'abord les mapper à l'étape précédente.</p></Card>
        <Actions><Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Mapping</Btn></Actions>
      </div>
    );
  }

  const m = mods[idx];
  const setIdx = (i: number) => setState((prev) => ({ ...prev, _activeFicheIdx: i }));
  const patchM = (p: Partial<Module>) => setState((prev) => ({ ...prev, data: { ...prev.data, modules: prev.data.modules.map((mm, k) => (k === idx ? { ...mm, ...p } : mm)) } }));

  const lecons = Array.isArray(m.lecons) ? m.lecons : [];
  const setLecons = (next: Lecon[]) => patchM({ lecons: next });
  const patchLecon = (li: number, field: keyof Lecon, v: string) => setLecons(lecons.map((l, k) => (k === li ? { ...l, [field]: v } : l)));
  const newLecon = (): Lecon => { const nv = freshLecon(); nv.id = "lec_" + Date.now().toString(36) + "_" + Math.round(Math.random() * 1e5); return nv; };
  const addLecon = (after?: number) => { if (lecons.length >= MAX_LECONS) return; const n = [...lecons]; if (typeof after === "number") n.splice(after + 1, 0, newLecon()); else n.push(newLecon()); setLecons(n); };
  const removeLecon = (li: number) => { if (lecons.length <= MIN_LECONS) return; const n = [...lecons]; n.splice(li, 1); setLecons(n); };
  const moveLecon = (li: number, dir: number) => { const j = li + dir; if (j < 0 || j >= lecons.length) return; const n = [...lecons]; const t = n[li]; n[li] = n[j]; n[j] = t; setLecons(n); };

  const objWarn = validateObjectifMesurable(m.objectif_mesurable);
  const leconsValides = lecons.filter((l) => (l.titre || "").trim().length >= 3 && (l.angle || "").trim().length >= 10).length;
  const nbActiveRecall = lecons.filter((l) => (l.titre || "").trim().length >= 3 && (l.angle || "").trim().length >= 10 && (l.active_recall || "").trim().length >= 10).length;
  const dureeLecons = lecons.reduce((acc, l) => acc + (parseInt(l.duree_min, 10) || 0), 0);
  const dureeMod = parseInt(m.duree_video, 10) || 0;
  const dureeMismatch = dureeMod > 0 && dureeLecons > 0 && Math.abs(dureeMod - dureeLecons) > Math.max(10, dureeMod * 0.25);
  const complete = isModuleFicheComplete(m);

  const cohHint = coh.score === "unknown" ? null
    : coh.score === "warning" ? { cls: "#E86B6B", txt: "⚠ " + coh.warnings.length + " point" + (coh.warnings.length > 1 ? "s" : "") + " à corriger" }
    : coh.score === "info" ? { cls: "#FFB450", txt: "i " + coh.warnings.length + " point" + (coh.warnings.length > 1 ? "s" : "") + " d'attention" }
    : { cls: "#4cc987", txt: "✓ Cohérence Bloom" };

  return (
    <div>
      <StepEyebrow>Étape 6 / 6 · Fiches modules</StepEyebrow>
      <StepTitle>
        Fiches modules · le cœur du programme
        {cohHint && <span className="ml-2 align-middle text-[11px] font-semibold" style={{ color: cohHint.cls }}>{cohHint.txt}</span>}
      </StepTitle>
      <StepSub>
        Pour chaque module : <strong className="text-white/80">objectif mesurable</strong>, niveau Bloom, durée, type d'exercice,
        livrable, mise en situation, auto-évaluation, et <strong className="text-white/80">découpage en leçons</strong>. C'est ton plan de tournage.
      </StepSub>

      {/* Onglets modules */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {mods.map((mm, i) => {
          const done = isModuleFicheComplete(mm);
          const active = i === idx;
          const named = (mm.nom || "").trim();
          const color = active ? "#080808" : done ? "#4cc987" : named ? "#FFB450" : "rgba(255,255,255,0.4)";
          const label = (mm.nom || "Module " + (i + 1)).slice(0, 24) + ((mm.nom || "").length > 24 ? "…" : "");
          return (
            <button key={mm.id || i} type="button" onClick={() => setIdx(i)} className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all"
              style={{ background: active ? "linear-gradient(135deg, #C9A84C 0%, #E8C770 100%)" : "#14130E", color, border: active ? "none" : "0.5px solid " + (done ? "rgba(76,201,135,0.4)" : named ? "rgba(255,180,80,0.4)" : "rgba(201,168,76,0.18)") }}>
              {i + 1}. {label}
            </button>
          );
        })}
      </div>

      {/* Fiche active */}
      <Card className="mb-5">
        <h3 className="mb-1 text-[16px] font-semibold text-white">Module {idx + 1} · {m.nom || "(sans nom)"} {m.niveau_bloom && <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(201,168,76,0.15)", color: "#C9A84C" }}>{BLOOM_LEVELS[m.niveau_bloom as BloomKey]?.label}</span>}</h3>
        <div className="mb-4 text-[12px] text-white/50">Obstacle d'origine : « {m.obstacle_origine} »</div>

        <div className="mb-4"><FieldLabel hint="verbe d'action + résultat">Nom du module</FieldLabel>
          <input type="text" value={m.nom} onChange={(e) => patchM({ nom: e.target.value })} placeholder="Ex. Générer 30 appels qualifiés par mois" className={inputCls} style={inputStyle} /></div>

        <div className="mb-4"><FieldLabel hint="à la fin, l'élève sera capable de… avec critère de vérification">Objectif mesurable</FieldLabel>
          <TextArea value={m.objectif_mesurable} onChange={(e) => patchM({ objectif_mesurable: e.target.value })} rows={3} placeholder="Ex. À la fin du module, l'élève aura rédigé 3 pages de vente notées au moins 8/10 sur la grille fournie" />
          {objWarn && <div className="mt-1.5 text-[11px] leading-[1.45] text-amber-400/80">{objWarn.message}</div>}</div>

        <div className="mb-4"><FieldLabel hint={"options filtrées selon ton tier " + tier.toUpperCase()}>Niveau Bloom</FieldLabel>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {bloomKeys.map((k) => <RadioCard key={k} selected={m.niveau_bloom === k} onClick={() => patchM({ niveau_bloom: k as BloomKey })} label={BLOOM_LEVELS[k].label} meta={BLOOM_LEVELS[k].meta} badge={k === bloomReco ? "reco " + tier.toUpperCase() : undefined} />)}
          </div></div>

        <div className="mb-4"><FieldLabel hint="en minutes · 30-60 min par module est un bon repère">Durée vidéo cible totale</FieldLabel>
          <input type="text" value={m.duree_video} onChange={(e) => patchM({ duree_video: e.target.value })} placeholder="Ex. 45" className={inputCls} style={inputStyle} /></div>

        <div className="mb-4"><FieldLabel hint={"la forme du livrable demandé" + (tier !== "ht" ? " · le « projet fil rouge » est réservé high-ticket" : "")}>Type d'exercice</FieldLabel>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(EXERCICE_TYPES) as ExerciceKey[]).filter((k) => k !== "projet" || tier === "ht").map((k) => <RadioCard key={k} selected={m.type_exercice === k} onClick={() => patchM({ type_exercice: k })} label={EXERCICE_TYPES[k].label} meta={EXERCICE_TYPES[k].meta} />)}
          </div></div>

        <div className="mb-4"><FieldLabel hint="ce que l'élève produit concrètement">Livrable attendu</FieldLabel>
          <TextArea value={m.livrable_attendu} onChange={(e) => patchM({ livrable_attendu: e.target.value })} rows={2} placeholder="Ex. 3 pages de vente rédigées + grille d'auto-notation remplie" /></div>
        <div className="mb-4"><FieldLabel hint="le contexte de pratique réelle">Mise en situation</FieldLabel>
          <TextArea value={m.mise_situation} onChange={(e) => patchM({ mise_situation: e.target.value })} rows={2} placeholder="Ex. Rédiger 3 pages de vente sur 3 offres réelles de la base de cas" /></div>
        <div className="mb-4"><FieldLabel hint="comment l'élève sait qu'il a réussi sans toi">Auto-évaluation</FieldLabel>
          <TextArea value={m.auto_evaluation} onChange={(e) => patchM({ auto_evaluation: e.target.value })} rows={2} placeholder="Ex. Grille en 10 critères avec seuil de validation à 8/10" /></div>

        <div className="mb-4"><FieldLabel hint="override optionnel · ex. coach sync uniquement sur le module fondateur">Mode de validation de ce module</FieldLabel>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <RadioCard selected={!m.mode_validation} onClick={() => patchM({ mode_validation: "" })} label="Défaut programme" meta={"Hérite de la décision globale · actuellement : " + (ACCOUNTABILITY_VALIDATION[state.data.accountability.validation_par_defaut as AccValidationKey]?.label || "non défini")} />
            {(Object.keys(ACCOUNTABILITY_VALIDATION) as AccValidationKey[]).map((k) => <RadioCard key={k} selected={m.mode_validation === k} onClick={() => patchM({ mode_validation: k })} label={ACCOUNTABILITY_VALIDATION[k].label} meta={ACCOUNTABILITY_VALIDATION[k].meta} />)}
          </div></div>

        {/* Leçons */}
        <div className="mb-4 rounded-xl p-3.5" style={{ background: "#0C0B08", border: "0.5px solid rgba(201,168,76,0.12)" }}>
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#C9A84C]">Découpage en leçons · plan de tournage</div>
          <p className="mb-3 text-[11.5px] leading-[1.5] text-white/50">Découpe ton module en <strong className="text-white/70">{MIN_LECONS} à {MAX_LECONS} leçons</strong> de 5-15 min. Chaque leçon a un titre (verbe d'action) et un angle. <strong className="text-white/70">Au moins 2 leçons doivent avoir une question d'active recall</strong>.</p>

          <div className="space-y-3">
            {lecons.map((l, li) => {
              const lOk = (l.titre || "").trim().length >= 3 && (l.angle || "").trim().length >= 10;
              return (
                <div key={l.id || li} className="rounded-lg p-2.5" style={{ background: "#14130E", border: "0.5px solid " + (lOk ? "rgba(76,201,135,0.3)" : "rgba(201,168,76,0.14)") }}>
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 text-[11px] font-bold text-[#C9A84C]">{idx + 1}.{li + 1}</div>
                    <input type="text" value={l.titre} onChange={(e) => patchLecon(li, "titre", e.target.value)} placeholder="Titre de la leçon (ex. Identifier les 3 traits de ta niche)" className={inputCls} style={inputStyle} />
                    <button type="button" onClick={() => moveLecon(li, -1)} disabled={li === 0} className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#C9A84C] disabled:opacity-25" style={{ background: "rgba(201,168,76,0.08)" }}><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => moveLecon(li, 1)} disabled={li === lecons.length - 1} className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#C9A84C] disabled:opacity-25" style={{ background: "rgba(201,168,76,0.08)" }}><ChevronDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => addLecon(li)} disabled={lecons.length >= MAX_LECONS} className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#C9A84C] disabled:opacity-25" style={{ background: "rgba(201,168,76,0.08)" }}><Plus className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => removeLecon(li)} disabled={lecons.length <= MIN_LECONS} className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[#E86B6B] disabled:opacity-25" style={{ background: "rgba(232,107,107,0.08)" }}><X className="h-3 w-3" /></button>
                  </div>
                  <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35">Angle pédagogique · ce que l'élève apprend précisément ici</div>
                  <textarea value={l.angle} onChange={(e) => patchLecon(li, "angle", e.target.value)} rows={2} placeholder="Ex. Critères concrets d'une niche spécifique : taille du marché, pouvoir d'achat, douleur urgente identifiable." className={inputCls + " mt-1 resize-y"} style={inputStyle} />
                  <div className="mt-2 flex gap-2">
                    <div className="w-24 shrink-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35">Durée min</div>
                      <input type="text" value={l.duree_min} onChange={(e) => patchLecon(li, "duree_min", e.target.value)} placeholder="8" className={inputCls + " mt-1"} style={inputStyle} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35">Active recall · question (optionnel)</div>
                      <input type="text" value={l.active_recall} onChange={(e) => patchLecon(li, "active_recall", e.target.value)} placeholder="Ex. Donne 3 niches qui répondent aux critères vus" className={inputCls + " mt-1"} style={inputStyle} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={() => addLecon()} disabled={lecons.length >= MAX_LECONS} className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold text-[#C9A84C] disabled:opacity-40" style={{ background: "rgba(201,168,76,0.06)", border: "0.5px solid rgba(201,168,76,0.4)" }}>
            <Plus className="h-3.5 w-3.5" /> Ajouter une leçon
          </button>
          <div className="mt-2 text-[11px]" style={{ color: leconsValides >= MIN_LECONS ? "#4cc987" : "#FFB450" }}>
            {leconsValides} / {lecons.length} leçon{lecons.length > 1 ? "s" : ""} complète{leconsValides > 1 ? "s" : ""} · {nbActiveRecall} avec active recall · minimum {MIN_LECONS} leçons + 2 active recall requis{dureeLecons > 0 ? " · " + dureeLecons + " min réparties" + (dureeMismatch ? " (écart avec la durée totale " + dureeMod + " min)" : "") : ""}
          </div>
        </div>

        <div className="mb-2"><FieldLabel hint="spiral learning · optionnel · format libre">Concepts repris des modules précédents</FieldLabel>
          <TextArea value={m.concepts_revises} onChange={(e) => patchM({ concepts_revises: e.target.value })} rows={2} placeholder={idx === 0 ? "Premier module — laisse vide ou note les acquis pré-programme attendus." : "Ex. Niche validée (M1) · Posture vendeur halal (M2) · Grille de qualification (M3)"} /></div>

        <div className="mt-3 rounded-lg px-3 py-2 text-[12px] font-semibold" style={{ background: complete ? "rgba(76,201,135,0.1)" : "rgba(255,180,80,0.08)", color: complete ? "#4cc987" : "#FFB450" }}>
          {complete ? "✓ Fiche complète" : "○ Fiche incomplète — il manque encore des champs obligatoires (dont " + MIN_LECONS + " leçons avec titre + angle, et 2 active recall)"}
        </div>
      </Card>

      {!lockReady && (
        <div className="mb-4 rounded-xl px-4 py-2.5 text-[12.5px] leading-[1.5]" style={{ background: "rgba(201,138,76,0.06)", borderLeft: "2px solid #c98a4c", color: "#e8c9a0" }}>
          Pour verrouiller, il te manque <strong>{missingFieldsLabel("module_fiches", state.data)}</strong>.
        </div>
      )}

      <Actions>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Mapping</Btn>
          {idx > 0 && <Btn variant="ghost" onClick={() => setIdx(idx - 1)}><ChevronLeft className="h-4 w-4" /> Module {idx}</Btn>}
          {idx < mods.length - 1 && <Btn variant="ghost" onClick={() => setIdx(idx + 1)}>Module {idx + 2} <ChevronRight className="h-4 w-4" /></Btn>}
        </div>
        <Btn variant="cta" disabled={!lockReady} onClick={onNext}><Lock className="h-4 w-4" /> Verrouiller le programme</Btn>
      </Actions>
    </div>
  );
}
