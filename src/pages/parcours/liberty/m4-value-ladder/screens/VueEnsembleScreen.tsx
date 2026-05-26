import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Star } from "lucide-react";
import { Btn, Actions, Card, InputBlock, InputLabel, InputHelper, TextInput, TextArea } from "../../m1-niche/components/ui";
import { StepHeader } from "../components/StepHeader";
import {
  type M4State, type TierId,
  TIERS, TIER_LABELS, TIER_PRICE_RANGES, TIER_ROLES,
} from "../lib/types";

interface Props {
  state: M4State;
  setState: (n: (p: M4State) => M4State) => void;
  onBack: () => void;
  onNext: () => void;
}

export function VueEnsembleScreen({ state, setState, onBack, onNext }: Props) {
  const ht = state.ladder.high;
  const m3 = state.m3_data;
  const m3Complete = !!(m3 && m3.complete);
  const m3Hints = m3
    ? {
        promesse: m3.promesse ?? "",
        mecanisme: m3.mecanisme?.nom ?? "",
        prix: m3.prix?.montant ? `${m3.prix.montant}€` : "",
        format: m3.vehicule?.format ?? "",
      }
    : null;
  const hasHints = !!(m3Hints && (m3Hints.promesse || m3Hints.prix || m3Hints.format));

  const setHt = (patch: Partial<typeof ht>) =>
    setState((prev) => ({ ...prev, ladder: { ...prev.ladder, high: { ...prev.ladder.high, ...patch } } }));

  const canNext = !!ht.name.trim() && !!ht.price.trim() && !!ht.format.trim();

  return (
    <div>
      <StepHeader
        current={1}
        total={4}
        title="Tes 4 marches en un coup d'œil"
        sub={
          m3Complete
            ? "Voici ton écosystème conceptuel — ton HT (déjà signé en M3) au sommet, et les 3 marches qui peuvent l'entourer. Tu ne construiras pas forcément les 4 — ça dépend de ta stratégie d'entrée (étape suivante)."
            : "Voici ton écosystème conceptuel. Le HT n'étant pas encore signé en M3, on installe le squelette et on verrouille les fondations du sommet."
        }
      />

      {/* Peda-box règle d'or */}
      <div
        className="mb-5 rounded-xl p-4 text-[13px] leading-[1.65]"
        style={{
          background: "rgba(201,168,76,0.05)",
          border: "0.5px solid rgba(201,168,76,0.4)",
          color: "#ECEEF4",
        }}
      >
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          ⚡ Rappel — la règle d'or HT-first
        </div>
        <p className="text-white/80">
          Tu vois 4 niveaux mais tu ne les construis pas dans n'importe quel ordre. La règle :{" "}
          <strong className="text-[#E8C770]">10 clients HT avant un MT. Un MT qui tourne avant un LT. Pas l'inverse.</strong>{" "}
          Le sommet finance la value ladder — un LT lancé trop tôt te bouffe ton attention sans rentabilité.
        </p>
      </div>

      {/* SVG Ladder responsive */}
      <div className="mb-6 overflow-hidden rounded-2xl" style={{ background: "#0B0A07", border: "0.5px solid rgba(201,168,76,0.2)" }}>
        <LadderSVG state={state} />
      </div>

      {/* M3 Hints non-destructifs */}
      {hasHints && m3Hints && (
        <div
          className="mb-5 rounded-xl p-4 text-[13px]"
          style={{ background: "rgba(201,168,76,0.05)", border: "0.5px dashed rgba(201,168,76,0.5)" }}
        >
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
            <Sparkles className="h-3 w-3" />
            Suggestions depuis ton Module 3 (à recopier si tu veux)
          </div>
          <div className="space-y-1.5 text-white/80">
            {m3Hints.promesse && (
              <p>
                <strong className="text-white">Promesse cœur :</strong>{" "}
                <em className="text-white/70">« {m3Hints.promesse} »</em>
              </p>
            )}
            {m3Hints.mecanisme && (
              <p>
                <strong className="text-white">Nom du mécanisme :</strong> {m3Hints.mecanisme}{" "}
                <span className="text-white/40">(pas forcément le nom commercial — choisis un nom qui se vend)</span>
              </p>
            )}
            {m3Hints.prix && (<p><strong className="text-white">Prix M3 :</strong> {m3Hints.prix}</p>)}
            {m3Hints.format && (<p><strong className="text-white">Format M3 :</strong> {m3Hints.format}</p>)}
          </div>
          <p className="mt-3 text-[12px] italic text-white/50">
            💡 Pas de pré-remplissage automatique pour éviter d'écraser tes choix. Recopie ce qui t'aide.
          </p>
        </div>
      )}

      {/* HT Editor */}
      <div
        className="mb-5 rounded-xl p-4"
        style={{ background: "rgba(201,168,76,0.08)", border: "0.5px solid rgba(201,168,76,0.5)" }}
      >
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#E8C770]">
          <Star className="h-3.5 w-3.5 fill-[#E8C770]" />
          High-ticket — ton sommet
        </div>

        <InputBlock>
          <InputLabel>Nom commercial de l'offre HT *</InputLabel>
          <TextInput
            value={ht.name}
            onChange={(e) => setHt({ name: e.target.value })}
            placeholder="Ex : AFFILIÉ AL BARAKA · 90 jours, ou BRIDGE Cadre → Freelance"
          />
          <InputHelper>Le nom que tu utilises sur ta page de vente — court, mémorable, focalisé sur le résultat.</InputHelper>
        </InputBlock>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InputBlock>
            <InputLabel>Prix affiché *</InputLabel>
            <TextInput
              value={ht.price}
              onChange={(e) => setHt({ price: e.target.value })}
              placeholder="Ex : 3 000€ ou 3×1 200€"
            />
          </InputBlock>
          <InputBlock>
            <InputLabel>Format de livraison *</InputLabel>
            <TextInput
              value={ht.format}
              onChange={(e) => setHt({ format: e.target.value })}
              placeholder="Ex : 12 sem · groupe 8 max · 2 calls/sem"
            />
          </InputBlock>
        </div>

        <InputBlock>
          <InputLabel>
            Pourquoi le HT existe (rationale)
            <span className="ml-2 text-[10px] font-normal text-white/40">— optionnel, auto-suggéré depuis M3</span>
          </InputLabel>
          <TextArea
            rows={3}
            value={ht.rationale}
            onChange={(e) => setHt({ rationale: e.target.value })}
            placeholder="Pourquoi cette offre est le sommet de ton écosystème ? Quelle transformation elle livre ?"
          />
        </InputBlock>
      </div>

      {/* Les 4 rôles */}
      <Card className="mb-5">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Les 4 rôles — un par marche
        </div>
        <p className="mb-4 text-[13px] leading-[1.55] text-white/55">
          Chaque niveau a un job précis. Si une marche n'a pas son rôle clair, elle est inutile (ou pire : elle cannibalise la suivante).
        </p>
        <div className="space-y-3">
          <RoleRow
            star
            title="★ HIGH-TICKET (1 000-9 999€)"
            body="Le sommet. Transformation profonde + accompagnement humain dense. C'est ici que vit ta marge — un client HT paie 10× plus qu'un client LT pour environ 3× le coût de delivery. Sans HT validé, le reste de la ladder est une illusion."
          />
          <RoleRow
            title="MID-TICKET (100-997€)"
            body="La version DIY de ta transformation. Même méthode, sans coaching live. Capte les indécis qui ne mettent pas 3 000€ mais 497€ oui — et permet aux non-prioritaires de profiter quand même de ta méthode."
          />
          <RoleRow
            title="LOW-TICKET / TRIPWIRE (7-97€)"
            body="Convertit le curieux en client. N'est pas un profit center — son rôle est de transformer un lead chaud en acheteur payant pour qu'il rentre dans ton écosystème et soit ensuite éligible aux upsells."
          />
          <RoleRow
            title="FREEMIUM / LEAD MAGNET (0€)"
            body="Attire ton avatar dans ton univers. Quiz, PDF, mini-formation, simulateur — quelque chose d'actionnable en 15 min qui prouve ta valeur AVANT que le prospect mette un seul euro."
          />
        </div>
        <p className="mt-4 border-t pt-3 text-[12px] italic text-white/40" style={{ borderColor: "rgba(201,168,76,0.18)", borderStyle: "dashed" }}>
          ↪ L'Ultra-premium (10k€+) sera abordé en M18 — Value Ladder Revisitée, après ton premier cycle de commercialisation. On ne construit pas un done-for-you avant 50 ventes HT.
        </p>
      </Card>

      {/* Récap des 4 marches */}
      <Card className="mb-6">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#C9A84C]">
          Récap — tes 4 marches possibles
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-[12.5px]">
            <thead>
              <tr className="border-b text-[10px] uppercase tracking-[0.08em] text-white/40" style={{ borderColor: "rgba(201,168,76,0.18)" }}>
                <th className="py-2 pr-3 font-semibold">Niveau</th>
                <th className="py-2 pr-3 font-semibold">Prix</th>
                <th className="py-2 pr-3 font-semibold">Rôle</th>
                <th className="py-2 font-semibold">Ton offre</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tid) => {
                const t = state.ladder[tid];
                const isHigh = tid === "high";
                return (
                  <tr key={tid} className="border-b" style={{ borderColor: "rgba(255,255,255,0.04)", background: isHigh ? "rgba(201,168,76,0.06)" : undefined }}>
                    <td className="py-2.5 pr-3 font-semibold" style={{ color: isHigh ? "#E8C770" : "#C9A84C" }}>
                      {TIER_LABELS[tid]}{isHigh ? " ★" : ""}
                    </td>
                    <td className="py-2.5 pr-3 text-white/70">{t.price || TIER_PRICE_RANGES[tid]}</td>
                    <td className="py-2.5 pr-3 text-white/60">{TIER_ROLES[tid]}</td>
                    <td className="py-2.5 text-white/80">
                      {t.name
                        ? t.name
                        : isHigh
                          ? <em className="text-white/40">à renseigner ci-dessus</em>
                          : <span className="text-white/30">— défini en M6/M14/M16</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Actions>
        <Btn variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Welcome
        </Btn>
        <Btn variant="primary" disabled={!canNext} onClick={onNext}>
          Niveau d'entrée
          <ArrowRight className="h-4 w-4" />
        </Btn>
      </Actions>
    </div>
  );
}

function RoleRow({ title, body, star }: { title: string; body: string; star?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="mt-1.5 h-2 w-2 shrink-0 rounded-sm"
        style={{ background: star ? "#C9A84C" : "rgba(201,168,76,0.4)" }}
      />
      <div className="flex-1">
        <div className="mb-1 text-[12px] font-bold uppercase tracking-[0.1em]" style={{ color: star ? "#E8C770" : "#C9A84C" }}>
          {title}
        </div>
        <p className="text-[13px] leading-[1.55] text-white/75">{body}</p>
      </div>
    </div>
  );
}

/** Ladder SVG responsive — 4 marches empilées (Freemium en bas, High en haut). */
function LadderSVG({ state }: { state: M4State }) {
  const [isNarrow, setIsNarrow] = useState<boolean>(typeof window !== "undefined" ? window.innerWidth < 640 : false);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const W = isNarrow ? 560 : 920;
  const stepH = isNarrow ? 80 : 84;
  const gapY = isNarrow ? 8 : 10;
  const padTop = 24;
  const padBottom = 24;
  const H = padTop + padBottom + TIERS.length * stepH + (TIERS.length - 1) * gapY;

  // Ordre visuel : high (haut) → freemium (bas)
  const orderedTopDown: TierId[] = ["high", "mid", "low", "freemium"];
  const tierWidth = (tid: TierId, idx: number) => {
    // Largeur progressive : la plus large en bas (freemium)
    const minWidth = W * 0.42;
    const maxWidth = W * 0.92;
    const pct = idx / Math.max(1, orderedTopDown.length - 1);
    return minWidth + (maxWidth - minWidth) * pct;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="block h-auto w-full">
      <defs>
        <linearGradient id="m4-gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#C9A84C" />
          <stop offset="100%" stopColor="#E8C770" />
        </linearGradient>
      </defs>
      {orderedTopDown.map((tid, idx) => {
        const t = state.ladder[tid];
        const w = tierWidth(tid, idx);
        const x = (W - w) / 2;
        const y = padTop + idx * (stepH + gapY);
        const isHigh = tid === "high";
        const label = t.name || TIER_LABELS[tid];
        const price = t.price || TIER_PRICE_RANGES[tid];
        return (
          <g key={tid}>
            <rect
              x={x}
              y={y}
              width={w}
              height={stepH}
              rx={10}
              fill={isHigh ? "url(#m4-gold)" : "#14130E"}
              stroke={isHigh ? "rgba(201,168,76,0.8)" : "rgba(201,168,76,0.25)"}
              strokeWidth={isHigh ? 1.5 : 0.5}
            />
            <text
              x={W / 2}
              y={y + stepH / 2 - 6}
              textAnchor="middle"
              fontSize={isNarrow ? 13 : 15}
              fontWeight={700}
              fill={isHigh ? "#0B0A07" : "#E8C770"}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {isHigh ? "★ " : ""}{label}
            </text>
            <text
              x={W / 2}
              y={y + stepH / 2 + 14}
              textAnchor="middle"
              fontSize={isNarrow ? 11 : 12}
              fill={isHigh ? "rgba(11,10,7,0.7)" : "rgba(255,255,255,0.55)"}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {price}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
