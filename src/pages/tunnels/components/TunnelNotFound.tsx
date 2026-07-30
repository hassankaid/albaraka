import { T } from "../theme";

/**
 * Page « introuvable » du domaine des tunnels.
 *
 * Pendant du fichier statique `public/introuvable.html` (servi par Vercel avant
 * même que l'app ne se charge). Celle-ci ne sert qu'aux navigations internes.
 * Volontairement muette : elle ne mentionne ni la plateforme, ni son adresse.
 */
export default function TunnelNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: T.bg,
        backgroundImage:
          "radial-gradient(60% 45% at 50% 0%, rgba(201,160,78,0.10), transparent 70%), radial-gradient(50% 40% at 50% 100%, rgba(201,160,78,0.06), transparent 70%)",
        color: T.cream,
        fontFamily: T.body,
      }}
    >
      <main style={{ maxWidth: 460, textAlign: "center" }}>
        <p
          style={{
            margin: "0 0 28px",
            fontSize: 12,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: T.gold,
          }}
        >
          Al Baraka
        </p>
        <div
          style={{
            width: 44,
            height: 1,
            margin: "0 auto 28px",
            background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)`,
          }}
        />
        <h1
          style={{
            margin: "0 0 14px",
            fontFamily: T.display,
            fontSize: 28,
            fontWeight: 600,
            lineHeight: 1.3,
            color: T.goldBright,
          }}
        >
          Cette page n'existe pas
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: T.creamMuted }}>
          Le lien que vous avez suivi est incorrect ou n'est plus actif.
        </p>
      </main>
    </div>
  );
}
