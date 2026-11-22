// RdvDisqualification — Pages A..E du funnel /rdv.
// URL : /rdv/disqualification/:slug (slug = a|b|c|d|e)
//
// Deux sortes de pages :
//   - Refus (questions 1, 3, 4) : titre + message propres à la question, et
//     « Modifier ma réponse » (/rdv/questions?from=<index>). Page A : lien vers
//     la rediffusion du moment — « je n'ai pas regardé la conférence » ne doit
//     pas être une impasse.
//   - « Parlons-en » (questions 2 et 5, depuis le 22/11/2026, décision de
//     Sidali) : plus de refus, la personne peut demander à être rappelée
//     (action « rappel » de rdv-funnel-submit → fiche CRM « À relancer », note
//     et notification). Question 5 : le paiement en plusieurs fois est annoncé
//     ici seulement, avec « Ça me convient, je réserve mon appel ».
//
// L'encadré « Pour rappel » des 4 conditions a été retiré le 22/11/2026.
//
// Si le slug est inconnu (URL forgée) → redirect /rdv.
//
// Les chemins cités ci-dessus sont ceux de /rdv ; le parcours jumeau
// /rdv-rediffusion suit exactement les mêmes étapes sous son propre
// préfixe (cf. baseCourante / RDV_CALENDLY dans rdvShared).

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertCircle, CalendarCheck, Check, ChevronLeft, Loader2, PhoneCall, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/al-baraka-logo-v2.png";
import { THEME, DISQUALIFICATIONS, baseCourante, getStoredLeadId } from "./rdvShared";

type Envoi = "idle" | "envoi" | "ok" | "erreur";

const boutonPrincipal: CSSProperties = {
  background: `linear-gradient(180deg, ${THEME.goldBright} 0%, ${THEME.gold} 100%)`,
  color: "#1A1407",
  fontWeight: 600,
  fontSize: 14.5,
  padding: "13px 18px",
  borderRadius: 999,
  border: "none",
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(201,160,78,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontFamily: "inherit",
  textDecoration: "none",
  width: "100%",
  maxWidth: 360,
};

const boutonSecondaire: CSSProperties = {
  ...boutonPrincipal,
  background: "transparent",
  color: THEME.cream,
  border: `1px solid ${THEME.goldLine}`,
  boxShadow: "none",
};

const lienDiscret: CSSProperties = {
  background: "transparent",
  border: "none",
  color: THEME.creamMuted,
  fontSize: 13,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontFamily: "inherit",
  padding: "6px 12px",
};

export default function RdvDisqualification() {
  const navigate = useNavigate();
  const base = baseCourante(useLocation().pathname);
  const { slug } = useParams<{ slug: string }>();

  const normalizedSlug = (slug || "").toLowerCase() as "a" | "b" | "c" | "d" | "e";
  const config = DISQUALIFICATIONS[normalizedSlug];

  useEffect(() => {
    // Sans lead_id ou slug invalide → on revient à l'intro
    if (!getStoredLeadId() || !config) {
      navigate(base, { replace: true });
    }
  }, [config, navigate, base]);

  // Le funnel est générique : il ne sait pas de quelle conférence vient la
  // personne. On propose donc la dernière rediffusion mise en ligne, qui est
  // précisément celle dont on relance les inscrits.
  const [jetonRedif, setJetonRedif] = useState<string | null>(null);
  useEffect(() => {
    if (normalizedSlug !== "a") return;
    let annule = false;
    (async () => {
      // Fonction trop récente pour les types générés de Supabase.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await supabase.rpc("derniere_rediffusion_disponible" as any);
      if (annule || error) return;
      const ligne = Array.isArray(data) && data.length > 0 ? (data[0] as { token: string }) : null;
      if (ligne?.token) setJetonRedif(ligne.token);
    })();
    return () => {
      annule = true;
    };
  }, [normalizedSlug]);

  const [rappel, setRappel] = useState<Envoi>("idle");
  const [reservation, setReservation] = useState<Envoi>("idle");

  if (!config) return null;
  const parlonsEn = !!config.rappel;
  const modifier = () => navigate(`${base}/questions?from=${config.questionIndex}`);

  async function demanderRappel() {
    const leadId = getStoredLeadId();
    if (!leadId || rappel === "envoi" || rappel === "ok") return;
    setRappel("envoi");
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean }>("rdv-funnel-submit", {
      body: { action: "rappel", lead_id: leadId, question_index: config.questionIndex },
    });
    setRappel(error || !data?.ok ? "erreur" : "ok");
  }

  // Question 5 : le paiement en plusieurs fois lève le frein → on enregistre
  // « Oui » à la question 5 et on qualifie, comme en fin de questionnaire.
  async function reserver() {
    const leadId = getStoredLeadId();
    if (!leadId || reservation === "envoi") return;
    setReservation("envoi");
    const { data: a, error: errA } = await supabase.functions.invoke<{ ok?: boolean }>("rdv-funnel-submit", {
      body: { action: "answer", lead_id: leadId, question_index: config.questionIndex, answer: "yes" },
    });
    if (errA || !a?.ok) {
      setReservation("erreur");
      return;
    }
    const { data: q, error: errQ } = await supabase.functions.invoke<{ ok?: boolean }>("rdv-funnel-submit", {
      body: { action: "qualified", lead_id: leadId },
    });
    if (errQ || !q?.ok) {
      // Une réponse précédente n'est plus « Oui » : on renvoie au questionnaire.
      navigate(`${base}/questions?from=1`);
      return;
    }
    navigate(`${base}/calendly`);
  }

  return (
    <Cadre>
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <img
          src={logo}
          alt="AL BARAKA"
          style={{
            width: 56,
            height: 56,
            objectFit: "contain",
            marginInline: "auto",
            display: "block",
            marginBottom: 22,
            filter: "drop-shadow(0 0 18px rgba(201,160,78,0.24))",
            opacity: 0.85,
          }}
        />

        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            background: parlonsEn ? "rgba(201,160,78,0.12)" : "rgba(224,138,106,0.12)",
            border: `1px solid ${parlonsEn ? THEME.goldLine : "rgba(224,138,106,0.35)"}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          {parlonsEn ? <PhoneCall size={24} color={THEME.gold} /> : <AlertCircle size={26} color={THEME.danger} />}
        </div>

        <div
          style={{
            fontSize: 10.5,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: parlonsEn ? THEME.gold : THEME.danger,
            marginBottom: 10,
          }}
        >
          {parlonsEn ? config.rappel!.accroche : "Réservation impossible"}
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0, marginBottom: 16, lineHeight: 1.3, color: THEME.cream }}>
          {config.title}
        </h1>

        {parlonsEn && config.rappel!.reserver ? (
          <div
            style={{
              margin: "0 auto",
              maxWidth: 420,
              padding: "14px 18px",
              borderRadius: 12,
              border: `1px solid ${THEME.goldLine}`,
              background: "rgba(201,160,78,0.08)",
              color: THEME.goldBright,
              fontSize: 15.5,
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            {config.message}
          </div>
        ) : (
          <p style={{ color: THEME.creamMuted, fontSize: 15, lineHeight: 1.6, margin: "0 auto", maxWidth: 460 }}>
            {config.message}
          </p>
        )}
      </div>

      {parlonsEn ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
          {rappel === "ok" ? (
            <div
              role="status"
              style={{
                width: "100%",
                maxWidth: 420,
                textAlign: "center",
                padding: "18px 20px",
                borderRadius: 14,
                background: THEME.bgSoft,
                border: `1px solid ${THEME.goldLine}`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(201,160,78,0.16)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 10,
                }}
              >
                <Check size={20} color={THEME.gold} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: THEME.cream, marginBottom: 6 }}>C'est noté !</div>
              <div style={{ fontSize: 14, color: THEME.creamMuted, lineHeight: 1.55 }}>
                {config.rappel!.message} Gardez votre téléphone à portée de main.
              </div>
            </div>
          ) : (
            <>
              {config.rappel!.reserver && (
                <button type="button" onClick={reserver} disabled={reservation === "envoi"} style={boutonPrincipal}>
                  {reservation === "envoi" ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
                  Ça me convient, je réserve mon appel
                </button>
              )}
              <button
                type="button"
                onClick={demanderRappel}
                disabled={rappel === "envoi"}
                style={config.rappel!.reserver ? boutonSecondaire : boutonPrincipal}
              >
                {rappel === "envoi" ? <Loader2 size={16} className="animate-spin" /> : <PhoneCall size={16} />}
                Être rappelé(e) par l'équipe
              </button>
            </>
          )}

          {(rappel === "erreur" || reservation === "erreur") && (
            <div style={{ fontSize: 13, color: THEME.danger }}>Une erreur est survenue. Merci de réessayer.</div>
          )}

          {rappel !== "ok" && (
            <button type="button" onClick={modifier} style={lienDiscret}>
              <ChevronLeft size={14} />
              Modifier ma réponse
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
          {jetonRedif && (
            <>
              <a href={`/redif/${jetonRedif}`} style={{ ...boutonPrincipal, width: "auto", padding: "12px 28px" }}>
                <PlayCircle size={16} />
                Voir la rediffusion
              </a>
              <div style={{ fontSize: 12, color: THEME.creamDim, letterSpacing: "0.04em", marginBottom: 6, textAlign: "center" }}>
                Une fois la conférence visionnée, revenez réserver votre appel.
              </div>
            </>
          )}
          <button
            type="button"
            onClick={modifier}
            // Sur la page A, la rediffusion devient l'action principale :
            // ce bouton passe en second plan pour ne pas lui faire concurrence.
            style={{ ...(jetonRedif ? boutonSecondaire : boutonPrincipal), width: "auto", padding: "12px 28px" }}
          >
            <ChevronLeft size={16} />
            Modifier ma réponse
          </button>
          <div style={{ fontSize: 12, color: THEME.creamDim, letterSpacing: "0.04em" }}>
            Vous reviendrez à la question {config.questionIndex}
          </div>
        </div>
      )}
    </Cadre>
  );
}

function Cadre({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        position: "relative",
        overflow: "hidden",
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 20px 60px",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at top, rgba(201,160,78,0.08) 0%, rgba(10,9,8,0) 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 560, animation: "rdv-fade-in 0.45s ease-out" }}>
        {children}
      </div>
      <style>{`
        @keyframes rdv-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
