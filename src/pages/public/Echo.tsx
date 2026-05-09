// Echo — page de test pour valider que Systemio passe bien les variables
// d'une page à l'autre via URL params. Branchée en redirect "Après soumission"
// depuis une page de capture Systemio. Affiche tout ce qui arrive en query
// string + date d'arrivée, et signale les 3 variables clés attendues
// (email, prenom, tel).
//
// Quand le test est validé, cette page peut être supprimée.

import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import logo from "@/assets/al-baraka-logo-v2.png";
import { CheckCircle2, XCircle, Link as LinkIcon, Clock, AlertCircle } from "lucide-react";

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

// Variables qu'on s'attend à recevoir depuis le redirect Systemio.
// Si l'une est vide ou {{...}} non substituée, on le signale en rouge.
const EXPECTED_VARS = [
  { key: "email", label: "Email" },
  { key: "prenom", label: "Prénom" },
  { key: "tel", label: "Téléphone" },
];

function isPlaceholder(v: string): boolean {
  // Détecte les placeholders Systemio non substitués : {{...}}, {...}, [contact.xxx]
  return /^\{\{.*\}\}$/.test(v) || /^\{[^}]+\}$/.test(v) || /^\[[^\]]+\]$/.test(v);
}

export default function Echo() {
  const [searchParams] = useSearchParams();

  const allParams = useMemo(() => {
    const out: { key: string; value: string; isPlaceholder: boolean }[] = [];
    searchParams.forEach((value, key) => {
      out.push({ key, value, isPlaceholder: isPlaceholder(value) });
    });
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }, [searchParams]);

  const expectedStatus = useMemo(
    () =>
      EXPECTED_VARS.map((v) => {
        const raw = searchParams.get(v.key);
        const filled = raw !== null && raw.length > 0;
        const placeholder = filled && isPlaceholder(raw);
        return {
          ...v,
          raw,
          filled,
          placeholder,
          ok: filled && !placeholder,
        };
      }),
    [searchParams],
  );

  const fullUrl = typeof window !== "undefined" ? window.location.href : "";
  const now = new Date();
  const nowIso = now.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  const allOk = expectedStatus.every((s) => s.ok);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.bg,
        color: THEME.cream,
        padding: "40px 20px",
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src={logo}
            alt="AL BARAKA"
            style={{
              width: 64,
              height: 64,
              objectFit: "contain",
              marginBottom: 14,
              marginInline: "auto",
              display: "block",
              filter: "drop-shadow(0 0 18px rgba(201,160,78,0.18))",
            }}
          />
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: THEME.gold,
              marginBottom: 6,
            }}
          >
            Page de test — Echo
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, color: THEME.cream }}>
            Variables reçues depuis Systemio
          </h1>
          <p
            style={{
              fontSize: 12,
              color: THEME.creamMuted,
              marginTop: 8,
              maxWidth: 520,
              marginInline: "auto",
              lineHeight: 1.5,
            }}
          >
            Cette page sert uniquement à valider que Systemio passe correctement
            les paramètres URL après soumission de la page de capture. Elle sera
            supprimée une fois le test validé.
          </p>
        </div>

        {/* Synthèse globale */}
        <div
          style={{
            marginBottom: 24,
            padding: 16,
            borderRadius: 12,
            border: `1px solid ${allOk ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
            background: allOk ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {allOk ? (
            <CheckCircle2 size={24} style={{ color: "rgb(74,222,128)", flexShrink: 0 }} />
          ) : (
            <AlertCircle size={24} style={{ color: "rgb(248,113,113)", flexShrink: 0 }} />
          )}
          <div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
              {allOk
                ? "Toutes les variables attendues sont correctement reçues."
                : "Au moins une variable manque ou n'a pas été substituée."}
            </p>
            <p style={{ margin: "4px 0 0 0", fontSize: 12, color: THEME.creamMuted }}>
              {allOk
                ? "Tu peux donner le feu vert pour passer à l'étape suivante (formulaire de scoring)."
                : "Vérifie la syntaxe des variables dans Systemio (ex: {{contact.email}}, ${email}, ou autre selon leur doc)."}
            </p>
          </div>
        </div>

        {/* Variables attendues */}
        <section
          style={{
            background: "rgba(20,20,20,0.6)",
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            backdropFilter: "blur(20px)",
          }}
        >
          <h2
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: THEME.gold,
              margin: "0 0 14px 0",
              fontWeight: 500,
            }}
          >
            Variables attendues (3)
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {expectedStatus.map((s) => (
              <div
                key={s.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: s.ok
                    ? "rgba(34,197,94,0.06)"
                    : "rgba(239,68,68,0.06)",
                  border: `1px solid ${s.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                }}
              >
                {s.ok ? (
                  <CheckCircle2 size={16} style={{ color: "rgb(74,222,128)", flexShrink: 0 }} />
                ) : (
                  <XCircle size={16} style={{ color: "rgb(248,113,113)", flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: THEME.creamMuted,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    {s.label} <code style={{ color: THEME.goldBright, fontFamily: "monospace" }}>?{s.key}=</code>
                  </div>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: 13,
                      marginTop: 2,
                      wordBreak: "break-all",
                      color: s.ok ? THEME.cream : "rgb(248,113,113)",
                    }}
                  >
                    {!s.filled
                      ? "(vide ou absent)"
                      : s.placeholder
                        ? `${s.raw} (placeholder NON substitué !)`
                        : s.raw}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tous les paramètres reçus */}
        <section
          style={{
            background: "rgba(20,20,20,0.6)",
            border: `1px solid ${THEME.goldLine}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            backdropFilter: "blur(20px)",
          }}
        >
          <h2
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: THEME.gold,
              margin: "0 0 14px 0",
              fontWeight: 500,
            }}
          >
            Tous les paramètres URL reçus ({allParams.length})
          </h2>
          {allParams.length === 0 ? (
            <p style={{ fontSize: 13, color: THEME.creamDim, fontStyle: "italic", margin: 0 }}>
              Aucun paramètre URL reçu. Soit Systemio n'a rien substitué, soit la
              redirection n'a pas été déclenchée correctement.
            </p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${THEME.goldDim}` }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: THEME.creamMuted,
                      fontWeight: 500,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Clé
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      color: THEME.creamMuted,
                      fontWeight: 500,
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                    }}
                  >
                    Valeur
                  </th>
                </tr>
              </thead>
              <tbody>
                {allParams.map((p, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontFamily: "monospace",
                        color: THEME.goldBright,
                        verticalAlign: "top",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.key}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        fontFamily: "monospace",
                        color: p.isPlaceholder ? "rgb(248,113,113)" : THEME.cream,
                        wordBreak: "break-all",
                      }}
                    >
                      {p.value}
                      {p.isPlaceholder && (
                        <span style={{ color: "rgb(248,113,113)", marginLeft: 8, fontSize: 11 }}>
                          ⚠ placeholder non substitué
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* URL complète + timestamp */}
        <section
          style={{
            background: "rgba(20,20,20,0.4)",
            border: `1px solid ${THEME.goldDim}`,
            borderRadius: 12,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontSize: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <LinkIcon size={14} style={{ color: THEME.gold, marginTop: 2, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: THEME.creamMuted,
                  fontSize: 10,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 3,
                }}
              >
                URL complète
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  color: THEME.cream,
                  wordBreak: "break-all",
                }}
              >
                {fullUrl || "—"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={14} style={{ color: THEME.gold, flexShrink: 0 }} />
            <div>
              <span style={{ color: THEME.creamMuted, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginRight: 8 }}>
                Arrivée
              </span>
              <span style={{ fontFamily: "monospace", color: THEME.cream }}>{nowIso}</span>
            </div>
          </div>
        </section>

        <p
          style={{
            marginTop: 28,
            textAlign: "center",
            fontSize: 11,
            color: THEME.creamDim,
            lineHeight: 1.5,
          }}
        >
          Cette page n'écrit rien en base de données. Tu peux la rafraîchir / re-soumettre le
          formulaire Systemio autant de fois que tu veux pour valider la config.
        </p>
      </div>
    </div>
  );
}
