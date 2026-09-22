// ─────────────────────────────────────────────────────────────────────────
// Questionnaire clients AL BARAKA — /questionnaire/:token
//
// Une section par écran, barre de progression, enregistrement automatique.
// Pensé pour le téléphone d'abord : la grande majorité des élèves répondront
// depuis leur mobile.
//
// Le jeton dans l'URL fait tout : il identifie le client (rien à saisir),
// interdit la seconde réponse, et dit s'il faut poser la Q10. Il n'est jamais
// renvoyé ailleurs que vers nos propres fonctions.
//
// Les réponses partent en base à chaque changement, deux secondes après la
// dernière frappe. Quelqu'un qui ferme son téléphone au milieu d'une section
// retrouve ses réponses en rouvrant son lien.
// ─────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/al-baraka-logo-v2.png";
import {
  THEME as T, INTRO, CONFIDENTIALITE, REMERCIEMENT, SECTIONS,
  questionsVisibles, manquantes, type Question, type Reponses,
} from "./questions";

type Ecran = "chargement" | "intro" | "sections" | "merci" | "erreur";

interface Ouverture {
  ok: boolean;
  raison?: string;
  prenom?: string | null;
  formation?: string;
  demander_formation?: boolean;
  reponses?: Reponses;
}

export default function Questionnaire() {
  const { token } = useParams<{ token: string }>();
  const [ecran, setEcran] = useState<Ecran>("chargement");
  const [raison, setRaison] = useState<string | null>(null);
  const [prenom, setPrenom] = useState<string | null>(null);
  const [demanderFormation, setDemanderFormation] = useState(false);
  const [reponses, setReponses] = useState<Reponses>({});
  const [index, setIndex] = useState(0);
  const [aSignaler, setASignaler] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const minuteur = useRef<number | null>(null);

  // ── Ouverture ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setEcran("erreur"); setRaison("lien_inconnu"); return; }
    let annule = false;
    (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc("questionnaire_ouvrir" as any, { p_token: token });
      if (annule) return;
      const d = (data ?? null) as Ouverture | null;
      if (error || !d) { setEcran("erreur"); setRaison("indisponible"); return; }
      if (!d.ok) { setEcran("erreur"); setRaison(d.raison ?? "lien_inconnu"); setPrenom(d.prenom ?? null); return; }
      setPrenom(d.prenom ?? null);
      setDemanderFormation(Boolean(d.demander_formation));
      setReponses(d.reponses ?? {});
      setEcran("intro");
      document.title = "Questionnaire — AL BARAKA";
    })();
    return () => { annule = true; };
  }, [token]);

  // ── Enregistrement automatique ────────────────────────────────────────
  const enregistrer = useCallback(async (r: Reponses, final = false) => {
    if (!token) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await supabase.rpc("questionnaire_enregistrer" as any, {
      p_token: token, p_reponses: r, p_final: final,
    });
    return data as { ok: boolean; raison?: string } | null;
  }, [token]);

  const repondre = (id: string, valeur: string | string[]) => {
    setReponses((prec) => ({ ...prec, [id]: valeur }));
    setASignaler((prec) => prec.filter((x) => x !== id));
  };

  /**
   * Cocher / décocher une option de la Q27.
   *
   * La nouvelle liste se calcule à partir de l'état PRÉCÉDENT, pas de ce que
   * le rendu courant affiche. Deux options cochées coup sur coup partent du
   * même affichage : en dérivant de la liste affichée, la seconde effaçait
   * la première. Constaté en recette, trois cases cochées, une seule gardée.
   */
  const basculer = (id: string, option: string) => {
    setReponses((prec) => {
      const liste = Array.isArray(prec[id]) ? (prec[id] as string[]) : [];
      return {
        ...prec,
        [id]: liste.includes(option) ? liste.filter((x) => x !== option) : [...liste, option],
      };
    });
    setASignaler((prec) => prec.filter((x) => x !== id));
  };

  // L'enregistrement automatique se déclenche APRÈS le rendu, jamais depuis la
  // mise à jour d'état : une fonction de mise à jour doit rester pure, et React
  // la rejoue en développement — le minuteur partait alors en double.
  const premierRendu = useRef(true);
  useEffect(() => {
    if (ecran !== "sections") return;
    if (premierRendu.current) { premierRendu.current = false; return; }
    if (minuteur.current) window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => void enregistrer(reponses), 2000);
    return () => { if (minuteur.current) window.clearTimeout(minuteur.current); };
  }, [reponses, ecran, enregistrer]);

  const section = SECTIONS[index];
  const visibles = useMemo(
    () => (section ? questionsVisibles(section, reponses, demanderFormation) : []),
    [section, reponses, demanderFormation],
  );

  const suivant = async () => {
    const trous = manquantes(section, reponses, demanderFormation);
    if (trous.length > 0) {
      setASignaler(trous.map((q) => q.id));
      document.getElementById(`q-${trous[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (minuteur.current) window.clearTimeout(minuteur.current);
    setEnvoi(true);
    const dernier = index === SECTIONS.length - 1;
    const rep = await enregistrer(reponses, dernier);
    setEnvoi(false);
    if (rep && !rep.ok) { setEcran("erreur"); setRaison(rep.raison ?? "indisponible"); return; }
    if (dernier) { setEcran("merci"); window.scrollTo(0, 0); return; }
    setIndex(index + 1);
    window.scrollTo(0, 0);
  };

  const precedent = () => {
    if (minuteur.current) window.clearTimeout(minuteur.current);
    void enregistrer(reponses);
    setIndex(Math.max(0, index - 1));
    window.scrollTo(0, 0);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────
  const styleBase: React.CSSProperties = {
    minHeight: "100vh", background: T.bg, color: T.cream,
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: "28px 18px 56px",
  };

  if (ecran === "chargement") {
    return <div style={{ ...styleBase, display: "grid", placeItems: "center" }} />;
  }

  if (ecran === "erreur") {
    const messages: Record<string, { titre: string; texte: string }> = {
      deja_repondu: {
        titre: prenom ? `Merci ${prenom}, c'est déjà fait` : "C'est déjà fait",
        texte: "Tu as déjà répondu à ce questionnaire. Une seule réponse par personne — la tienne est bien enregistrée.",
      },
      lien_inconnu: {
        titre: "Ce lien n'est pas valide",
        texte: "Utilise le lien reçu par e-mail, qui t'est personnel. Si le problème persiste, écris à ethicarena@outlook.com.",
      },
      indisponible: {
        titre: "Le questionnaire est momentanément indisponible",
        texte: "Réessaie dans quelques instants avec le même lien.",
      },
    };
    const m = messages[raison ?? "lien_inconnu"] ?? messages.lien_inconnu;
    return (
      <div style={styleBase}>
        <Entete />
        <div style={{ maxWidth: 520, margin: "40px auto 0", textAlign: "center" }}>
          <h1 style={{ fontSize: 24, lineHeight: 1.2, margin: "0 0 14px" }}>{m.titre}</h1>
          <p style={{ color: T.creamMuted, fontSize: 15, lineHeight: 1.6, margin: 0 }}>{m.texte}</p>
        </div>
      </div>
    );
  }

  if (ecran === "merci") {
    return (
      <div style={styleBase}>
        <Entete />
        <div style={{ maxWidth: 520, margin: "44px auto 0", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, margin: "0 auto 24px", borderRadius: "50%",
            border: `1px solid ${T.goldLine}`, display: "grid", placeItems: "center",
            background: "radial-gradient(circle, rgba(201,160,78,0.16), transparent 70%)",
          }}>
            <span style={{ fontSize: 30, lineHeight: 1 }}>✅</span>
          </div>
          <h1 style={{ fontSize: 24, lineHeight: 1.25, margin: "0 0 14px" }}>{REMERCIEMENT.titre}</h1>
          <p style={{ color: T.creamMuted, fontSize: 15.5, lineHeight: 1.65, margin: "0 0 26px" }}>
            {REMERCIEMENT.texte}
          </p>
          <p style={{
            color: T.goldBright, fontSize: 14, letterSpacing: "0.06em",
            textTransform: "uppercase", fontWeight: 600, margin: 0,
          }}>
            {REMERCIEMENT.signature}
          </p>
        </div>
      </div>
    );
  }

  if (ecran === "intro") {
    return (
      <div style={styleBase}>
        <Entete />
        <div style={{ maxWidth: 560, margin: "32px auto 0" }}>
          <h1 style={{ fontSize: 26, lineHeight: 1.2, margin: "0 0 18px", textAlign: "center" }}>
            {prenom ? `Salam ${prenom}` : "Salam"}
          </h1>
          <p style={{ color: T.creamMuted, fontSize: 15.5, lineHeight: 1.7, margin: "0 0 20px" }}>
            {INTRO}
          </p>
          <div style={{
            background: T.bgSoft, border: `1px solid ${T.goldLine}`, borderRadius: 14,
            padding: "16px 18px", marginBottom: 28,
          }}>
            <div style={{
              fontSize: 10.5, letterSpacing: "0.2em", textTransform: "uppercase",
              color: T.gold, fontWeight: 600, marginBottom: 8,
            }}>
              Confidentialité
            </div>
            <p style={{ color: T.creamMuted, fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
              {CONFIDENTIALITE}
            </p>
          </div>
          <Bouton onClick={() => { setEcran("sections"); window.scrollTo(0, 0); }}>
            Commencer
          </Bouton>
          <p style={{ textAlign: "center", color: T.creamDim, fontSize: 12.5, marginTop: 12 }}>
            Environ 5 minutes · 7 sections
          </p>
        </div>
      </div>
    );
  }

  const progression = Math.round(((index + 1) / SECTIONS.length) * 100);

  return (
    <div style={styleBase}>
      <Entete />
      <div style={{ maxWidth: 620, margin: "24px auto 0" }}>
        {/* Progression */}
        <div style={{ marginBottom: 26 }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            marginBottom: 8, fontSize: 11.5, letterSpacing: "0.12em", textTransform: "uppercase",
          }}>
            <span style={{ color: T.gold, fontWeight: 600 }}>
              Section {index + 1} sur {SECTIONS.length}
            </span>
            <span style={{ color: T.creamDim }}>{progression} %</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: "rgba(245,241,230,0.10)", overflow: "hidden" }}>
            <div style={{
              width: `${progression}%`, height: "100%", borderRadius: 999,
              background: `linear-gradient(90deg, ${T.gold}, ${T.goldBright})`,
              transition: "width 260ms ease",
            }} />
          </div>
        </div>

        <h2 style={{ fontSize: 21, lineHeight: 1.25, margin: "0 0 24px" }}>{section.titre}</h2>

        {visibles.map((q) => (
          <Bloc
            key={q.id}
            question={q}
            valeur={reponses[q.id]}
            signale={aSignaler.includes(q.id)}
            onChange={(v) => repondre(q.id, v)}
            onBasculer={(o) => basculer(q.id, o)}
          />
        ))}

        <div style={{ display: "flex", gap: 10, marginTop: 30 }}>
          {index > 0 && (
            <button
              type="button"
              onClick={precedent}
              style={{
                flex: "0 0 auto", padding: "14px 20px", borderRadius: 999,
                border: `1px solid ${T.goldLine}`, background: "transparent",
                color: T.cream, fontSize: 14.5, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Précédent
            </button>
          )}
          <div style={{ flex: 1 }}>
            <Bouton onClick={suivant} disabled={envoi}>
              {envoi ? "Un instant…" : index === SECTIONS.length - 1 ? "Envoyer mes réponses" : "Suivant"}
            </Bouton>
          </div>
        </div>

        {aSignaler.length > 0 && (
          <p style={{ color: T.danger, fontSize: 13.5, marginTop: 14, textAlign: "center" }}>
            Il reste {aSignaler.length === 1 ? "une question" : `${aSignaler.length} questions`} sans réponse
            dans cette section.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Morceaux d'interface ────────────────────────────────────────────────

function Entete() {
  return (
    <div style={{ textAlign: "center" }}>
      <img src={logo} alt="AL BARAKA" style={{ height: 46, opacity: 0.95 }} />
    </div>
  );
}

function Bouton({ children, onClick, disabled }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "15px 22px", borderRadius: 999, border: "none",
        background: `linear-gradient(180deg, ${T.goldBright} 0%, ${T.gold} 100%)`,
        color: "#1A1407", fontSize: 15.5, fontWeight: 700, cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.7 : 1, fontFamily: "inherit",
        boxShadow: "0 10px 28px rgba(201,160,78,0.26)",
      }}
    >
      {children}
    </button>
  );
}

function Bloc({ question, valeur, signale, onChange, onBasculer }: {
  question: Question;
  valeur: string | string[] | undefined;
  signale: boolean;
  onChange: (v: string | string[]) => void;
  onBasculer: (option: string) => void;
}) {
  const q = question;
  return (
    <div
      id={`q-${q.id}`}
      style={{
        marginBottom: 26, paddingBottom: 22,
        borderBottom: `1px solid rgba(245,241,230,0.07)`,
      }}
    >
      <div style={{ display: "flex", gap: 10, marginBottom: q.aide ? 6 : 14 }}>
        <span style={{ color: T.gold, fontSize: 13, fontWeight: 700, flexShrink: 0, paddingTop: 2 }}>
          {q.numero}.
        </span>
        <span style={{ fontSize: 16, lineHeight: 1.45, fontWeight: 500 }}>{q.titre}</span>
      </div>
      {q.aide && (
        <p style={{ color: T.creamDim, fontSize: 13, lineHeight: 1.5, margin: "0 0 14px 24px" }}>
          {q.aide}
        </p>
      )}

      <div style={{ marginLeft: 24 }}>
        {q.type === "unique" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {q.options!.map((o) => (
              <Choix key={o} libelle={o} actif={valeur === o} onClick={() => onChange(o)} />
            ))}
          </div>
        )}

        {q.type === "multiple" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {q.options!.map((o) => (
              <Choix
                key={o}
                libelle={o}
                actif={(Array.isArray(valeur) ? valeur : []).includes(o)}
                carre
                onClick={() => onBasculer(o)}
              />
            ))}
          </div>
        )}

        {q.type === "echelle" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {Array.from({ length: q.max! - q.min! + 1 }, (_, i) => q.min! + i).map((n) => {
              const actif = String(valeur ?? "") === String(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(String(n))}
                  style={{
                    width: 40, height: 44, borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${actif ? T.gold : "rgba(245,241,230,0.16)"}`,
                    background: actif ? T.goldDim : "transparent",
                    color: actif ? T.goldBright : T.creamMuted,
                    fontSize: 15, fontWeight: actif ? 700 : 500, fontFamily: "inherit",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        )}

        {q.type === "texte" && (
          <input
            value={(valeur as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={champ(signale)}
          />
        )}

        {q.type === "texte_long" && (
          <textarea
            value={(valeur as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            style={{ ...champ(signale), resize: "vertical", lineHeight: 1.55 }}
          />
        )}

        {signale && (
          <p style={{ color: T.danger, fontSize: 12.5, margin: "8px 0 0" }}>
            Cette réponse est nécessaire pour continuer.
          </p>
        )}
      </div>
    </div>
  );
}

function Choix({ libelle, actif, carre, onClick }: {
  libelle: string; actif: boolean; carre?: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 11, width: "100%",
        padding: "13px 15px", borderRadius: 12, cursor: "pointer", textAlign: "left",
        border: `1px solid ${actif ? T.gold : "rgba(245,241,230,0.14)"}`,
        background: actif ? T.goldDim : "transparent",
        color: actif ? T.cream : T.creamMuted,
        fontSize: 14.5, fontFamily: "inherit", lineHeight: 1.4,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 18, height: 18, flexShrink: 0,
          borderRadius: carre ? 5 : "50%",
          border: `1.5px solid ${actif ? T.gold : "rgba(245,241,230,0.3)"}`,
          background: actif ? T.gold : "transparent",
          display: "grid", placeItems: "center",
        }}
      >
        {actif && (
          <span style={{
            width: carre ? 9 : 7, height: carre ? 5 : 7,
            borderRadius: carre ? 0 : "50%",
            borderLeft: carre ? "2px solid #1A1407" : undefined,
            borderBottom: carre ? "2px solid #1A1407" : undefined,
            background: carre ? "transparent" : "#1A1407",
            transform: carre ? "rotate(-45deg) translate(1px,-1px)" : undefined,
          }} />
        )}
      </span>
      {libelle}
    </button>
  );
}

const champ = (signale: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "13px 15px",
  borderRadius: 12,
  border: `1px solid ${signale ? T.danger : "rgba(245,241,230,0.16)"}`,
  background: "rgba(255,255,255,0.03)",
  color: T.cream,
  fontSize: 15,
  fontFamily: "inherit",
  outline: "none",
});
