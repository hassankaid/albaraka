// ScoringStart — page transitoire entre Systemio capture et le quiz scoring.
// Reçue après redirect Systemio : /scoring/start?funnel=<slug>
//
// Comportement :
//   1. Affiche un loader animé "Préparation de ton diagnostic personnalisé…"
//   2. Appelle match-scoring-token toutes les 1.2s (max ~12s)
//   3. Dès qu'un token est matché → redirige vers /scoring/quiz?token=<id>&funnel=<slug>
//   4. Si échec après timeout → redirige vers /scoring/quiz?funnel=<slug>&orphan=1
//      (la page de quiz gère ce cas en demandant les coords manuellement —
//      filet de sécurité invisible pour le lead, on n'attend rien de lui).
//
// Aucune écriture en BDD ici.

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/al-baraka-logo-v2.png";
import { META_PIXEL_CONTACT_KEY } from "@/lib/metaPixel";

const THEME = {
  bg: "#0A0A0A",
  bgSoft: "#111111",
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDim: "rgba(201,160,78,0.18)",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
};

const TICK_MS = 1200;
const MAX_ATTEMPTS = 10; // ~12 s max

const STATUS_TEXTS = [
  "Préparation de ton diagnostic personnalisé…",
  "Analyse de ton profil…",
  "On y est presque…",
  "Encore quelques instants…",
];

type MatchResponse =
  | { matched: true; token: string; funnel_slug: string; funnel_name?: string; contact?: any }
  | { matched: false; funnel_slug: string }
  | { error: string; [k: string]: any };

export default function ScoringStart() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const funnel = (searchParams.get("funnel") || "").trim();

  const [statusText, setStatusText] = useState(STATUS_TEXTS[0]);
  const [error, setError] = useState<string | null>(null);
  const attemptsRef = useRef(0);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!funnel) {
      setError("Lien invalide : paramètre funnel manquant.");
      return;
    }

    let timeoutId: number | undefined;

    const tick = async () => {
      if (cancelledRef.current) return;
      attemptsRef.current += 1;
      const attempt = attemptsRef.current;

      // Met à jour le texte de status pour l'effet UX
      const idx = Math.min(STATUS_TEXTS.length - 1, Math.floor(attempt / 3));
      setStatusText(STATUS_TEXTS[idx]);

      try {
        const { data, error: fnErr } = await supabase.functions.invoke<MatchResponse>(
          "match-scoring-token",
          { body: { funnel } },
        );

        if (cancelledRef.current) return;

        if (fnErr) {
          // 4xx avec body JSON (ex: funnel_not_found_or_inactive)
          const ctx = (fnErr as { context?: Response }).context;
          let parsed: any = null;
          if (ctx && typeof ctx.json === "function") {
            try { parsed = await ctx.json(); } catch { parsed = null; }
          }
          if (parsed?.error === "funnel_not_found_or_inactive") {
            setError("Ce lien de diagnostic n'existe plus ou a été désactivé.");
            return;
          }
          // Erreur réseau ou serveur transitoire → on poll quand même
          console.warn("[ScoringStart] match attempt error", fnErr.message);
        }

        if (data && (data as any).matched === true) {
          const ok = data as Extract<MatchResponse, { matched: true }>;
          // Stocke les infos contact en sessionStorage pour que ScoringQuiz
          // les lise et les utilise dans Meta Pixel Advanced Matching (hashées
          // côté client en SHA-256 avant envoi à Meta). Scope onglet, expirée
          // à la fermeture du tab. Pas dans l'URL pour ne pas exposer email/
          // téléphone en clair dans les logs.
          if (ok.contact) {
            try {
              sessionStorage.setItem(
                META_PIXEL_CONTACT_KEY,
                JSON.stringify({
                  email: ok.contact.email ?? null,
                  first_name: ok.contact.first_name ?? null,
                  last_name: ok.contact.last_name ?? null,
                  phone: ok.contact.phone ?? null,
                }),
              );
            } catch {
              /* sessionStorage indispo (mode privé strict) → tant pis */
            }
          }
          // Match trouvé → redirige immédiatement vers le quiz
          navigate(
            `/scoring/quiz?funnel=${encodeURIComponent(funnel)}&token=${encodeURIComponent(ok.token)}`,
            { replace: true },
          );
          return;
        }

        // Pas matché : on poll encore
        if (attempt >= MAX_ATTEMPTS) {
          // Timeout → mode orphelin invisible. La page quiz s'occupera
          // soit de matcher différemment (par les coords saisies au formulaire
          // de capture qu'on aurait stockées en cookie — pas notre cas), soit
          // de capturer la réponse en orphelin pour matching manuel CEO.
          navigate(
            `/scoring/quiz?funnel=${encodeURIComponent(funnel)}&orphan=1`,
            { replace: true },
          );
          return;
        }

        // Re-schedule next tick
        timeoutId = window.setTimeout(tick, TICK_MS);
      } catch (e: any) {
        console.warn("[ScoringStart] tick exception", e);
        if (attempt >= MAX_ATTEMPTS) {
          navigate(`/scoring/quiz?funnel=${encodeURIComponent(funnel)}&orphan=1`, { replace: true });
          return;
        }
        timeoutId = window.setTimeout(tick, TICK_MS);
      }
    };

    // Premier appel après un court délai pour laisser le webhook le temps
    // de créer le token (le webhook fire avant le redirect, mais on laisse
    // marge sur la latence réseau).
    timeoutId = window.setTimeout(tick, 600);

    return () => {
      cancelledRef.current = true;
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [funnel, navigate]);

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
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      {/* Halo doré statique en fond */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(201,160,78,0.12) 0%, rgba(10,9,8,0) 60%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", maxWidth: 480 }}>
        <img
          src={logo}
          alt="AL BARAKA"
          style={{
            width: 96,
            height: 96,
            objectFit: "contain",
            marginBottom: 28,
            marginInline: "auto",
            display: "block",
            filter: "drop-shadow(0 0 30px rgba(201,160,78,0.32))",
          }}
        />

        {error ? (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: THEME.cream, marginTop: 0, marginBottom: 14 }}>
              Lien invalide
            </h1>
            <p style={{ color: THEME.creamMuted, fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              {error}
            </p>
          </>
        ) : (
          <>
            {/* Spinner doré */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                border: `3px solid ${THEME.goldDim}`,
                borderTopColor: THEME.gold,
                margin: "0 auto 28px",
                animation: "alb-spin 0.9s linear infinite",
              }}
            />
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: THEME.gold,
                marginBottom: 10,
              }}
            >
              Diagnostic personnalisé
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: THEME.cream,
                margin: 0,
                lineHeight: 1.4,
              }}
              key={statusText}
            >
              <span
                style={{
                  display: "inline-block",
                  animation: "alb-fade-in 0.45s ease-out",
                }}
              >
                {statusText}
              </span>
            </h1>
            <p
              style={{
                color: THEME.creamMuted,
                fontSize: 12,
                marginTop: 14,
                lineHeight: 1.5,
              }}
            >
              On finalise ton parcours, ne ferme pas cette page.
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes alb-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes alb-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
