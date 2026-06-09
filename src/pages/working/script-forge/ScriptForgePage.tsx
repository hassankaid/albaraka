import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Printer, Wand2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  type FormData, type CallType, type Segment, type Profile, type ProspectOrigin,
  SEGMENTS, PROFILES, PROFILE_DURATION, defaultFormData, STORAGE_KEY,
} from "./lib/types";
import { DEMOS } from "./lib/demos";
import { buildScript } from "./lib/build-script";
import { renderPreview, PREVIEW_CSS } from "./lib/render-preview";
import { useLibertyOffer } from "./lib/useLibertyOffer";

const C = {
  bg: "#0A0A0A", card: "#141414", elevated: "#1C1C1C", input: "#0F0F0F",
  gold: "#C9A961", goldBright: "#E0C88E", goldSoft: "rgba(201,169,97,0.12)",
  cream: "#F4E9CC", white: "#FAF6EC", smoke: "#888", smokeLight: "#B8B8B8",
  line: "#262626", lineBright: "#3A3A3A",
};

type View = "welcome" | "typeChoice" | "demosList" | "demoDetail" | "form" | "preview";

const SEG_TABS: { key: Segment; label: string }[] = [
  { key: "argent", label: "Argent" }, { key: "sante", label: "Santé" }, { key: "relations", label: "Relations" },
];

export default function ScriptForgePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { prefill } = useLibertyOffer(user?.id);

  const [form, setForm] = useState<FormData>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...defaultFormData(), ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return defaultFormData();
  });
  const [view, setView] = useState<View>("welcome");
  const [currentDemoId, setCurrentDemoId] = useState<string | null>(null);
  const [demoSegment, setDemoSegment] = useState<Segment>("argent");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateSegment, setTemplateSegment] = useState<Segment>("argent");
  const [previewTitle, setPreviewTitle] = useState("Aperçu du PDF");
  const previewHtmlRef = useRef<string>("");

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); } catch { /* ignore */ }
  }, [form]);

  const set = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => setForm((p) => ({ ...p, [k]: v })), []);
  const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const go = (v: View) => { setView(v); scrollTop(); };

  const goToForm = (type?: CallType) => {
    if (type) set("type", type);
    go("form");
  };
  const openDemoDetail = (id: string) => { setCurrentDemoId(id); go("demoDetail"); };

  const computePreview = (f: FormData, title: string) => {
    const steps = buildScript(f);
    previewHtmlRef.current = renderPreview(f, steps);
    setPreviewTitle(title);
    go("preview");
  };

  const loadDemoScript = (demoId: string, type: CallType) => {
    const demo = DEMOS.find((d) => d.id === demoId);
    if (!demo) return;
    const f: FormData = { ...demo.formData, type };
    setForm(f);
    computePreview(f, `${demo.name} — Script ${type === "discovery" ? "Découverte" : "Closing"}`);
  };

  const applyTemplate = (demoId: string) => {
    const demo = DEMOS.find((d) => d.id === demoId);
    if (!demo) return;
    setForm({ ...demo.formData, type: form.type }); // conserve le type choisi
    setTemplateOpen(false);
    scrollTop();
    toast({ title: "Modèle chargé", description: `« ${demo.name} » — adapte les champs à ton offre.` });
  };

  const applyLibertyPrefill = () => {
    if (!prefill) return;
    setForm((p) => ({ ...p, ...prefill.values }));
    toast({ title: "Offre Liberty importée", description: `${prefill.filledKeys.length} champs préremplis depuis ton offre${prefill.offerName ? ` « ${prefill.offerName} »` : ""}. Vérifie et ajuste.` });
  };

  const showPreview = () => computePreview(form, `${form.type === "discovery" ? "Appel découverte" : "Appel closing"} — ${SEGMENTS[form.segment].label}`);

  // ─────────────────────────────── UI helpers ───────────────────────────────
  const Eyebrow = ({ children }: { children: React.ReactNode }) => (
    <div className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "4px", color: C.gold }}>{children}</div>
  );
  const Title = ({ children, size = 52 }: { children: React.ReactNode; size?: number }) => (
    <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: size, color: C.white, fontWeight: 500, lineHeight: 1.05, letterSpacing: "-0.5px" }}>{children}</h1>
  );

  const ChoiceCard = ({ icon, title, desc, cta, onClick, primary }: { icon: string; title: string; desc: string; cta: string; onClick: () => void; primary?: boolean }) => (
    <button type="button" onClick={onClick} className="text-left rounded-2xl p-7 transition-all hover:-translate-y-0.5"
      style={{ background: C.card, border: `1px solid ${primary ? "rgba(201,169,97,0.4)" : C.line}` }}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold" style={{ background: C.goldSoft, color: C.gold, border: `1px solid rgba(201,169,97,0.3)`, fontFamily: "Fraunces, serif" }}>{icon}</div>
      <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, color: C.white, fontWeight: 500 }}>{title}</div>
      <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: C.smokeLight }}>{desc}</p>
      <div className="mt-4 text-[13px] font-semibold" style={{ color: C.gold }}>{cta}</div>
    </button>
  );

  const BackLink = ({ onClick, label }: { onClick: () => void; label: string }) => (
    <button type="button" onClick={onClick} className="text-[13px] transition-colors hover:opacity-80" style={{ color: C.smoke }}>{label}</button>
  );

  const Hero = ({ eyebrow, title, subtitle, size }: { eyebrow: string; title: React.ReactNode; subtitle: string; size?: number }) => (
    <div className="mx-auto mb-12 max-w-[640px] text-center">
      <div className="mb-4"><Eyebrow>{eyebrow}</Eyebrow></div>
      <Title size={size}>{title}</Title>
      <p className="mx-auto mt-4 max-w-[580px] text-[15px] leading-relaxed" style={{ color: C.smokeLight }}>{subtitle}</p>
      <div className="mx-auto mt-7 h-px w-10" style={{ background: C.gold }} />
    </div>
  );

  // Option (type/segment/profile/origin) toggle
  const Opt = ({ active, onClick, badge, label, sub }: { active: boolean; onClick: () => void; badge?: string; label: string; sub?: string }) => (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl p-3.5 text-left transition-all"
      style={{ background: active ? C.goldSoft : C.input, border: `1px solid ${active ? C.gold : C.line}` }}>
      {badge !== undefined && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: active ? C.gold : C.elevated, color: active ? C.bg : C.smokeLight, fontFamily: "Fraunces, serif" }}>{badge}</span>
      )}
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold" style={{ color: active ? C.white : C.cream }}>{label}</span>
        {sub && <span className="block text-[11.5px]" style={{ color: C.smoke }}>{sub}</span>}
      </span>
    </button>
  );

  const Field = ({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) => (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-[12.5px]" style={{ color: C.smokeLight }}>
        {label}{optional && <span style={{ opacity: 0.5, fontWeight: 400 }}> (optionnel)</span>}
      </label>
      {children}
      {hint && <div className="mt-1 text-[11.5px]" style={{ color: C.smoke }}>{hint}</div>}
    </div>
  );
  const inputStyle: React.CSSProperties = { background: C.input, border: `1px solid ${C.line}`, color: C.white };
  const TextInput = (p: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...p} className="w-full rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-[#C9A961]" style={{ ...inputStyle, ...(p.style || {}) }} />
  );

  const Card = ({ num, label, title, children }: { num: string; label: string; title: string; children: React.ReactNode }) => (
    <div className="mb-4 rounded-2xl p-6" style={{ background: C.card, border: `1px solid ${C.line}` }}>
      <div className="text-[11px] font-semibold uppercase" style={{ letterSpacing: "2px", color: C.gold }}>{num} — {label}</div>
      <div className="mb-4 mt-1 text-[18px] font-medium" style={{ color: C.white }}>{title}</div>
      {children}
    </div>
  );

  const goldBtn: React.CSSProperties = { background: C.gold, color: C.bg };
  const goldOutline: React.CSSProperties = { background: "transparent", border: `1px solid ${C.gold}`, color: C.gold };

  // ─────────────────────────────── Views ───────────────────────────────
  const filteredDemos = useMemo(() => DEMOS.filter((d) => d.formData.segment === demoSegment), [demoSegment]);
  const templateDemos = useMemo(() => DEMOS.filter((d) => d.formData.segment === templateSegment), [templateSegment]);
  const currentDemo = currentDemoId ? DEMOS.find((d) => d.id === currentDemoId) : null;

  const DemoGrid = ({ demos, onPick, cta }: { demos: typeof DEMOS; onPick: (id: string) => void; cta: string }) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {demos.map((d) => {
        const f = d.formData;
        return (
          <button key={d.id} type="button" onClick={() => onPick(d.id)} className="text-left rounded-xl p-5 transition-all hover:-translate-y-0.5"
            style={{ background: C.card, border: `1px solid ${C.line}` }}>
            <span className="inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ background: C.goldSoft, color: C.gold }}>{PROFILES[f.profile].label}</span>
            <div className="mt-2 text-[15px] font-semibold" style={{ color: C.white }}>{d.name}</div>
            <div className="mt-0.5 text-[12.5px]" style={{ color: C.gold }}>{f.offerName}</div>
            <div className="text-[12px]" style={{ color: C.smoke }}>{f.price} · {f.delay}</div>
            <div className="mt-2 text-[12.5px] italic" style={{ color: C.cream, fontFamily: "Fraunces, serif" }}>« {f.promise} »</div>
            <div className="mt-3 text-[12px] font-semibold" style={{ color: C.gold }}>{cta}</div>
          </button>
        );
      })}
    </div>
  );

  const SegFilter = ({ value, onChange }: { value: Segment; onChange: (s: Segment) => void }) => (
    <div className="mb-6 flex flex-wrap justify-center gap-2">
      {SEG_TABS.map((t) => (
        <button key={t.key} type="button" onClick={() => onChange(t.key)} className="rounded-full px-4 py-1.5 text-[13px] font-medium transition-all"
          style={value === t.key ? goldBtn : { background: C.card, color: C.smokeLight, border: `1px solid ${C.line}` }}>{t.label}</button>
      ))}
    </div>
  );

  return (
    <div className="-mx-4 -my-4 min-h-[calc(100vh-4rem)] md:-mx-6 md:-my-6" style={{ background: C.bg, color: C.white }}>
      {/* Brand bar */}
      <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: C.line }}>
        <div className="flex items-baseline gap-3">
          <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 20, color: C.gold, fontWeight: 600, letterSpacing: "1px" }}>AL BARAKA</span>
          <span className="text-[12px] uppercase" style={{ letterSpacing: "2px", color: C.smoke }}>Script Forge</span>
        </div>
        <Link to="/training/scripts" className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors hover:opacity-80" style={{ color: C.smoke }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Scripts
        </Link>
      </div>

      <div className="mx-auto w-full max-w-[1080px] px-5 py-10">
        {/* WELCOME */}
        {view === "welcome" && (
          <>
            <Hero eyebrow="GÉNÉRATEUR DE SCRIPTS D'APPEL" title={<>Crée ton script d'appel<br />sur mesure</>} subtitle="Un script personnalisé pour ta propre offre, ou inspire-toi de 10 cas réels avant de construire le tien." />
            <div className="mx-auto grid max-w-[760px] gap-4 sm:grid-cols-2">
              <ChoiceCard primary icon="→" title="Je crée mes scripts" desc="Renseigne ton offre, ton avatar et ta promesse. Tu obtiens un script personnalisé téléchargeable en PDF." cta="Commencer →" onClick={() => go("typeChoice")} />
              <ChoiceCard icon="○" title="Voir les cas démos" desc="Découvre 10 offres complètes (argent, santé, relations) pré-remplies. Inspire-toi avant de créer le tien." cta="Explorer →" onClick={() => { setDemoSegment("argent"); go("demosList"); }} />
            </div>
          </>
        )}

        {/* TYPE CHOICE */}
        {view === "typeChoice" && (
          <>
            <div className="mb-6"><BackLink onClick={() => go("welcome")} label="← Accueil" /></div>
            <Hero eyebrow="ÉTAPE 1 / 2 — CHOIX DU TYPE D'APPEL" title="Quel script veux-tu construire ?" subtitle="Découverte pour qualifier et inviter à ton événement de vente. Closing pour transformer un prospect qualifié en client." />
            <div className="mx-auto grid max-w-[760px] gap-4 sm:grid-cols-2">
              <ChoiceCard primary icon="D" title="Appel découverte" desc="Setting · Qualification du prospect en 6 étapes. Pour inviter ton prospect à un webinaire, une masterclass ou un appel de closing." cta="Construire →" onClick={() => goToForm("discovery")} />
              <ChoiceCard primary icon="C" title="Appel de closing" desc="Vente directe · Pitch + traitement des objections + annonce du prix en 12 étapes. Pour transformer un prospect qualifié en client." cta="Construire →" onClick={() => goToForm("closing")} />
            </div>
          </>
        )}

        {/* DEMOS LIST */}
        {view === "demosList" && (
          <>
            <div className="mb-6"><BackLink onClick={() => go("welcome")} label="← Accueil" /></div>
            <Hero eyebrow="ÉTAPE 1 / 2 — CHOIX DE LA NICHE" title="10 cas démos" subtitle="Choisis ton segment de marché, puis une niche pour voir ses scripts d'appel découverte et de closing." />
            <SegFilter value={demoSegment} onChange={setDemoSegment} />
            <DemoGrid demos={filteredDemos} onPick={openDemoDetail} cta="Voir les scripts  →" />
          </>
        )}

        {/* DEMO DETAIL */}
        {view === "demoDetail" && currentDemo && (
          <>
            <div className="mb-6"><BackLink onClick={() => go("demosList")} label="← Toutes les démos" /></div>
            <Hero
              eyebrow={`ÉTAPE 2 / 2 — ${SEGMENTS[currentDemo.formData.segment].label.toUpperCase()} · ${PROFILES[currentDemo.formData.profile].label.toUpperCase()}`}
              title={currentDemo.name}
              subtitle={`${currentDemo.formData.offerName} · ${currentDemo.formData.price} · ${currentDemo.formData.delay}`}
            />
            <div className="mx-auto grid max-w-[760px] gap-4 sm:grid-cols-2">
              <ChoiceCard primary icon="D" title="Script d'appel découverte" desc={`Qualifier un prospect et l'inviter à : ${currentDemo.formData.finalEvent || "l'événement final"}.`} cta="Voir le script →" onClick={() => loadDemoScript(currentDemo.id, "discovery")} />
              <ChoiceCard primary icon="C" title="Script d'appel de closing" desc={`Présenter ${currentDemo.formData.offerName} avec les 3 piliers et annoncer le prix de ${currentDemo.formData.price}.`} cta="Voir le script →" onClick={() => loadDemoScript(currentDemo.id, "closing")} />
            </div>
          </>
        )}

        {/* FORM */}
        {view === "form" && (
          <>
            <div className="mb-5 flex items-center justify-between">
              <BackLink onClick={() => go("welcome")} label="← Accueil" />
              <div className="text-[12px] uppercase" style={{ letterSpacing: "2px", color: C.smoke }}>{form.type === "discovery" ? "SCRIPT DÉCOUVERTE" : "SCRIPT CLOSING"}</div>
            </div>
            <div className="mb-7">
              <Eyebrow>CONFIGURATION</Eyebrow>
              <h1 className="mt-1" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 32, color: C.white, fontWeight: 500 }}>Renseigne les détails de ton offre</h1>
              <p className="mt-2 text-[14px]" style={{ color: C.smokeLight }}>Chaque champ enrichit ton script. Plus tu es précis, plus le script résonnera avec ton prospect.</p>
            </div>

            {/* Liberty prefill banner */}
            {prefill && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: "rgba(201,169,97,0.07)", border: `1px solid rgba(201,169,97,0.4)` }}>
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: C.gold }} />
                  <div>
                    <div className="text-[13.5px] font-semibold" style={{ color: C.goldBright }}>Tu as construit ton offre dans Liberty{prefill.offerName ? ` (« ${prefill.offerName} »)` : ""}</div>
                    <div className="text-[12.5px]" style={{ color: C.smokeLight }}>Préremplis ce script avec ta niche, ta promesse, ton prix, tes piliers et ta garantie.</div>
                  </div>
                </div>
                <button type="button" onClick={applyLibertyPrefill} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold" style={goldBtn}><Wand2 className="h-4 w-4" /> Préremplir depuis mon offre Liberty</button>
              </div>
            )}

            {/* Template banner */}
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.line}` }}>
              <div className="flex items-start gap-3">
                <div className="text-xl">⚡</div>
                <div>
                  <div className="text-[13.5px] font-semibold" style={{ color: C.white }}>Tu veux gagner du temps ?</div>
                  <div className="text-[12.5px]" style={{ color: C.smokeLight }}>Charge une démo comme base, puis adapte les champs à TON offre.</div>
                </div>
              </div>
              <button type="button" onClick={() => { setTemplateSegment("argent"); setTemplateOpen(true); }} className="rounded-full px-4 py-2 text-[13px] font-semibold" style={goldOutline}>Choisir un modèle démo →</button>
            </div>

            <Card num="01" label="TYPE D'APPEL" title="Découverte ou Closing ?">
              <div className="grid gap-3 sm:grid-cols-2">
                <Opt active={form.type === "discovery"} onClick={() => set("type", "discovery")} badge="D" label="Appel découverte" sub="Prospection · Qualification · 6 étapes" />
                <Opt active={form.type === "closing"} onClick={() => set("type", "closing")} badge="C" label="Appel de closing" sub="Vente · 12 étapes" />
              </div>
            </Card>

            <Card num="02" label="SEGMENT DE MARCHÉ" title="Dans quel segment évolue ton offre ?">
              <div className="grid gap-3 sm:grid-cols-3">
                <Opt active={form.segment === "argent"} onClick={() => set("segment", "argent")} badge="A" label="Argent" sub="Revenu · Business · Patrimoine" />
                <Opt active={form.segment === "sante"} onClick={() => set("segment", "sante")} badge="S" label="Santé" sub="Forme · Énergie · Mental" />
                <Opt active={form.segment === "relations"} onClick={() => set("segment", "relations")} badge="R" label="Relations" sub="Couple · Famille · Influence" />
              </div>
            </Card>

            <Card num="03" label="PROFIL DE PRIX" title="Dans quelle gamme se situe ton offre ?">
              <div className="grid gap-3 sm:grid-cols-3">
                {(["A", "B", "C"] as Profile[]).map((p) => (
                  <Opt key={p} active={form.profile === p} onClick={() => set("profile", p)} badge={p}
                    label={PROFILES[p].label} sub={`${PROFILES[p].price}  ·  ${PROFILE_DURATION(p, form.type)}`} />
                ))}
              </div>
            </Card>

            <Card num="04" label="TON OFFRE" title="Détails de l'offre">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom de l'offre"><TextInput value={form.offerName} onChange={(e) => set("offerName", e.target.value)} placeholder="Ex : Mastermind Liberté Financière" /></Field>
                <Field label="Prix"><TextInput value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Ex : 1 500€" /></Field>
              </div>
              <Field label="Promesse / Transformation chiffrée" hint="Le résultat concret que tu promets à ton client."><TextInput value={form.promise} onChange={(e) => set("promise", e.target.value)} placeholder="Ex : générer 3 000€/mois en revenus passifs" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Délai du résultat"><TextInput value={form.delay} onChange={(e) => set("delay", e.target.value)} placeholder="Ex : 6 mois" /></Field>
                <Field label="Fondateur / Expert"><TextInput value={form.founder} onChange={(e) => set("founder", e.target.value)} placeholder="Ton prénom ou nom de marque" /></Field>
              </div>
              <Field label="Valeur distinctive"><TextInput value={form.distinctiveValue} onChange={(e) => set("distinctiveValue", e.target.value)} placeholder="Ce qui te différencie de la concurrence" /></Field>
              {form.type === "closing" && (
                <Field label="Composantes de l'offre (une par ligne)" hint="Chaque ligne devient une composante dans le script (étapes 7-8 du closing).">
                  <textarea value={form.components} onChange={(e) => set("components", e.target.value)} rows={6}
                    placeholder={"Ex :\n3 modules de formation\nCoaching hebdomadaire en groupe\nCommunauté privée\nSuivi 1-to-1 mensuel\nBibliothèque de templates"}
                    className="w-full resize-y rounded-lg px-3 py-2.5 text-[14px] outline-none focus:border-[#C9A961]" style={inputStyle} />
                </Field>
              )}
            </Card>

            <Card num="05" label="LE PITCH" title="Ce qui rend ton offre désirable">
              <Field label="Avatar / public cible" hint="Plus tu es précis, plus le script utilisera des références qui résonnent avec ton prospect."><TextInput value={form.avatar} onChange={(e) => set("avatar", e.target.value)} placeholder="Ex : entrepreneurs digitaux 30-45 ans qui veulent stabiliser leur business" /></Field>
              <Field label="Douleur principale du prospect" hint="La frustration #1 que ton client type ressent. Utilisée dans l'étape « explorer la douleur »."><TextInput value={form.mainPain} onChange={(e) => set("mainPain", e.target.value)} placeholder="Ex : galérer à dépasser le palier des 3 000€/mois" /></Field>
              <Field label="Big idea (ton mécanisme unique)" hint="Pourquoi ta méthode marche là où les autres échouent. Utilisée à l'étape de présentation."><TextInput value={form.bigIdea} onChange={(e) => set("bigIdea", e.target.value)} placeholder="Ex : la méthode TRIBE qui combine personal branding + automatisation IA" /></Field>
              <Field label="Bonus inclus (cerise sur le gâteau)" hint="Ce qui fait basculer le prospect au moment du prix. Utilisé aux étapes 8 et 11 du closing."><TextInput value={form.mainBonus} onChange={(e) => set("mainBonus", e.target.value)} placeholder="Ex : accès à vie à la plateforme + droit de revente" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom du Pilier 1" optional hint='Nom propriétaire qui claque. Si vide : "Pilier 1" générique sera utilisé.'><TextInput value={form.pillar1Name} onChange={(e) => set("pillar1Name", e.target.value)} placeholder="Ex : Diagnostic & Style Signature" /></Field>
                <Field label="Nom du Pilier 2" optional hint='Le 3ème pilier est toujours "Accompagnement personnalisé" (universel).'><TextInput value={form.pillar2Name} onChange={(e) => set("pillar2Name", e.target.value)} placeholder="Ex : Gamme Premium & Vente" /></Field>
              </div>
            </Card>

            <Card num="06" label="GARANTIE & ANCRAGE PRIX" title="Ce qui rend ta proposition irrésistible">
              <Field label="Résultat minimum garanti" optional hint="Si tu offres une garantie de résultat, précise le résultat minimum. Utilisé dans l'étape « garantie » du closing."><TextInput value={form.guaranteeResult} onChange={(e) => set("guaranteeResult", e.target.value)} placeholder="Ex : signer ton premier wedding cake à 600€+ — sinon remboursé" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Prix de marché de référence" optional hint="Le prix qu'un programme équivalent se vend ailleurs. Utilisé pour l'ancrage."><TextInput value={form.marketPrice} onChange={(e) => set("marketPrice", e.target.value)} placeholder="Ex : entre 2 500€ et 4 000€" /></Field>
                <Field label="Coût de l'inaction (chiffré)" optional hint="Ce que ça coûte au prospect de ne RIEN faire pendant un an."><TextInput value={form.inactionCost} onChange={(e) => set("inactionCost", e.target.value)} placeholder="Ex : 8 000€/an de gâteaux sous-facturés" /></Field>
              </div>
            </Card>

            <Card num="07" label="ÉQUIPE & LOGISTIQUE" title="Qui appelle, par où, et d'où vient le prospect">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nom de qui appelle"><TextInput value={form.callerName} onChange={(e) => set("callerName", e.target.value)} placeholder="Ton prénom ou celui de ton commercial" /></Field>
                <Field label="Canal de contact"><TextInput value={form.channel} onChange={(e) => set("channel", e.target.value)} placeholder="Ex : WhatsApp, Instagram DM, Email" /></Field>
              </div>
              {form.type === "discovery" && (
                <Field label="Événement final" hint="L'événement de vente où le prospect entendra ton offre."><TextInput value={form.finalEvent} onChange={(e) => set("finalEvent", e.target.value)} placeholder="Ex : webinaire, conférence en ligne, masterclass" /></Field>
              )}
              <Field label="Origine du prospect (pour le closing)" hint="L'origine change le ton de l'ouverture du closing (étapes 1 et 2).">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {([["cold", "Cold / DM", "Prospection directe"], ["inbound", "Inbound", "Pub, lead magnet"], ["webinar", "Post-webinaire", "A vu ta masterclass"], ["referral", "Referral", "Recommandé par un client"]] as [ProspectOrigin, string, string][]).map(([o, l, sub]) => (
                    <Opt key={o} active={form.prospectOrigin === o} onClick={() => set("prospectOrigin", o)} label={l} sub={sub} />
                  ))}
                </div>
              </Field>
            </Card>

            <div className="mt-6 flex justify-end">
              <button type="button" onClick={showPreview} className="rounded-full px-6 py-3 text-[14px] font-semibold" style={goldBtn}>Voir l'aperçu PDF →</button>
            </div>
          </>
        )}

        {/* PREVIEW */}
        {view === "preview" && (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <BackLink onClick={() => go("welcome")} label="← Accueil" />
                <BackLink onClick={() => go("form")} label="Modifier" />
              </div>
              <div className="text-[13px] font-medium" style={{ color: C.cream }}>{previewTitle}</div>
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13px] font-semibold" style={goldBtn}><Printer className="h-4 w-4" /> Télécharger le PDF</button>
            </div>
            <style dangerouslySetInnerHTML={{ __html: PREVIEW_CSS }} />
            <div className="sf-print-root">
              <div className="sf-preview" dangerouslySetInnerHTML={{ __html: previewHtmlRef.current }} />
            </div>
          </>
        )}
      </div>

      {/* TEMPLATE MODAL */}
      {templateOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setTemplateOpen(false)}>
          <div className="relative mt-12 w-full max-w-[920px] rounded-2xl p-7" style={{ background: C.bg, border: `1px solid ${C.lineBright}` }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setTemplateOpen(false)} aria-label="Fermer" className="absolute right-4 top-4 text-2xl leading-none" style={{ color: C.smoke }}>×</button>
            <div className="mb-5 text-center">
              <Eyebrow>CHOISIR UN MODÈLE DÉMO</Eyebrow>
              <h2 className="mt-1" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 26, color: C.white, fontWeight: 500 }}>Sur quel segment travailles-tu ?</h2>
              <p className="mx-auto mt-2 max-w-[520px] text-[13px]" style={{ color: C.smokeLight }}>Choisis ton segment, puis le modèle démo qui se rapproche le plus de ton offre. Tu pourras tout modifier ensuite.</p>
            </div>
            <SegFilter value={templateSegment} onChange={setTemplateSegment} />
            <DemoGrid demos={templateDemos} onPick={applyTemplate} cta="Utiliser comme base →" />
          </div>
        </div>
      )}
    </div>
  );
}
