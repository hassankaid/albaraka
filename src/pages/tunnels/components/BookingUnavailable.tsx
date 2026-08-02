import { T } from "../theme";

/**
 * Panneau affiché à la place d'un agenda Calendly indisponible.
 *
 * Sert de garde-fou : plutôt que d'afficher un agenda mort (l'événement Calendly
 * n'existe plus), on montre un message net et à la marque. Réactivation = remettre
 * l'URL de l'événement dans `theme.ts` ; le panneau disparaît de lui-même.
 */
export default function BookingUnavailable({ note }: { note?: string }) {
  return (
    <div
      role="status"
      style={{
        border: `1px solid ${T.goldLine}`,
        borderRadius: 14,
        background: T.bgCard,
        padding: "clamp(26px, 5vw, 40px) clamp(20px, 4vw, 34px)",
        textAlign: "center",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 46,
          height: 46,
          margin: "0 auto 18px",
          borderRadius: "50%",
          border: `1px solid ${T.goldLine}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: T.gold,
          fontFamily: T.display,
          fontSize: "1.35rem",
          lineHeight: 1,
        }}
      >
        &#8987;
      </div>

      <h3
        style={{
          margin: "0 0 12px",
          fontFamily: T.display,
          fontWeight: 600,
          fontSize: "clamp(1.15rem, 3.2vw, 1.45rem)",
          lineHeight: 1.25,
          color: T.goldBright,
        }}
      >
        L'agenda ouvre très bientôt
      </h3>

      <p
        style={{
          margin: "0 auto",
          maxWidth: 440,
          fontFamily: T.body,
          fontSize: "clamp(0.94rem, 2.4vw, 1.02rem)",
          lineHeight: 1.65,
          color: T.creamMuted,
        }}
      >
        {note ??
          "La prise de rendez-vous est en cours de mise en place. Reviens sur cette page dans quelques instants — ta place est déjà réservée."}
      </p>
    </div>
  );
}
