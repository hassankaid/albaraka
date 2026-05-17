// ScheduleBlock — Bloc "Calendrier des prélèvements" partagé entre tous les
// checkouts (PaymentLinkCheckout, Checkout AL BARAKA, LibertyCheckout).
//
// Affiche la liste exhaustive des prélèvements avec date + montant pour
// chaque mensualité. En mode différé, propose au client de modifier la
// date de démarrage (fenêtre [demain, today+180j]).
//
// Cas gérés :
//   - 1× immédiat       → mini-rappel "Prélèvement aujourd'hui : X €"
//   - N× immédiat       → calendrier (1re = aujourd'hui, suivantes +1m)
//   - 1× différé        → calendrier avec date du 1er prélèvement (modifiable)
//   - N× différé        → calendrier complet (1re = date différée, suivantes +1m)
//
// Le composant ne gère QUE l'affichage. Le state clientChosenStartDate doit
// être hoisté dans le parent qui pourra le passer en prop à create-payment-intent.

import { useMemo } from "react";

// ─── Thème (aligné PaymentLinkCheckout / Checkout AL BARAKA / Liberty) ─────
const THEME = {
  gold: "#C9A04E",
  goldBright: "#E4C57A",
  goldDim: "rgba(201,160,78,0.18)",
  goldLine: "rgba(201,160,78,0.28)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.62)",
  creamDim: "rgba(245,241,230,0.38)",
};

// ─── Helpers exportés (réutilisables) ──────────────────────────────────────
export function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatFrDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatFrDateShort(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Calcule les dates de prélèvement de toutes les mensualités.
 * - Mode différé : démarre à startDateIso (date du lien ou choisie par le client).
 * - Mode immédiat : démarre aujourd'hui, +1 mois par mensualité.
 * Retourne un tableau de strings YYYY-MM-DD.
 */
export function computeInstallmentDates(
  startDateIso: string | null,
  count: number,
): string[] {
  const start = startDateIso
    ? new Date(`${startDateIso}T12:00:00`)
    : new Date();
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/** Date YYYY-MM-DD à today + N jours (pour les bornes min/max du picker) */
export function todayPlusISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Composant principal ScheduleBlock ─────────────────────────────────────
export interface ScheduleBlockProps {
  /** Total NET à régler (après coupon le cas échéant). */
  totalEur: number;
  /** Nombre de mensualités. */
  installments: number;
  /** True si le checkout est en mode différé (carte autorisée maintenant, débit plus tard). */
  isDeferred: boolean;
  /**
   * Date de démarrage effective (YYYY-MM-DD) :
   *   - Mode différé : la date du lien (ou choisie par le client si overridden)
   *   - Mode immédiat : null (start = aujourd'hui)
   */
  effectiveStartDateIso: string | null;
  /**
   * Date choisie par le client (YYYY-MM-DD ou null si pas encore modifiée).
   * Si fournie, prend priorité sur effectiveStartDateIso.
   * Setter pour le date picker.
   */
  clientChosenStartDate?: string | null;
  setClientChosenStartDate?: (d: string | null) => void;
  /** Bornes du date picker (YYYY-MM-DD). */
  minStartDate?: string;
  maxStartDate?: string;
}

export function ScheduleBlock({
  totalEur,
  installments,
  isDeferred,
  effectiveStartDateIso,
  clientChosenStartDate,
  setClientChosenStartDate,
  minStartDate,
  maxStartDate,
}: ScheduleBlockProps) {
  // Dates : différé → effectiveStartDateIso, immédiat → today.
  const dates = useMemo(
    () => computeInstallmentDates(isDeferred ? effectiveStartDateIso : null, installments),
    [isDeferred, effectiveStartDateIso, installments],
  );

  // Montants : la 1re mensualité absorbe les centimes restants.
  const baseCents = Math.floor((totalEur * 100) / installments);
  const extraCents = Math.round(totalEur * 100) - baseCents * installments;
  const amounts = Array.from({ length: installments }, (_, i) =>
    i === 0 ? (baseCents + extraCents) / 100 : baseCents / 100,
  );

  // Cas 1× immédiat : pas besoin de calendrier, mini-rappel suffit.
  if (!isDeferred && installments === 1) {
    return (
      <div
        style={{
          marginBottom: 24,
          padding: "10px 14px",
          borderRadius: 10,
          background: "rgba(201,160,78,0.06)",
          border: `1px solid ${THEME.goldLine}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
          color: THEME.cream,
        }}
      >
        <span style={{ color: THEME.creamMuted }}>Prélèvement aujourd'hui</span>
        <strong style={{ color: THEME.goldBright }}>{formatEur(totalEur)}</strong>
      </div>
    );
  }

  // Le date picker n'est rendu que si le parent a fourni les props nécessaires
  // (mode différé + setter + bornes). Évite de générer une UI inutile.
  const canEditDate =
    isDeferred &&
    !!setClientChosenStartDate &&
    !!minStartDate &&
    !!maxStartDate;

  return (
    <div
      style={{
        marginBottom: 24,
        padding: "16px 18px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${THEME.goldLine}`,
      }}
    >
      {/* ─── Section "Date de démarrage" modifiable par le client (mode différé) ─── */}
      {canEditDate && (
        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${THEME.goldDim}` }}>
          <div
            style={{
              fontSize: 10.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: THEME.creamDim,
              marginBottom: 8,
            }}
          >
            Date de démarrage
          </div>
          <input
            type="date"
            value={clientChosenStartDate || effectiveStartDateIso || ""}
            min={minStartDate}
            max={maxStartDate}
            onChange={(e) => setClientChosenStartDate!(e.target.value)}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 10,
              border: `1px solid ${THEME.goldDim}`,
              background: "rgba(255,255,255,0.02)",
              color: THEME.cream,
              fontSize: 14,
              fontFamily: "inherit",
              colorScheme: "dark",
            }}
          />
          <div
            style={{
              fontSize: 11,
              color: THEME.creamDim,
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            Vous pouvez modifier la date du 1<sup>er</sup> prélèvement (de
            demain jusqu'à 6 mois). Aucun montant n'est débité aujourd'hui — votre
            carte est seulement autorisée.
          </div>
        </div>
      )}

      {/* ─── Calendrier détaillé des prélèvements ─── */}
      <div
        style={{
          fontSize: 10.5,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: THEME.creamDim,
          marginBottom: 10,
        }}
      >
        Calendrier des prélèvements
        {installments > 1 && (
          <span style={{ color: THEME.goldBright, marginLeft: 8 }}>
            ({installments} mensualités)
          </span>
        )}
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
        }}
      >
        {dates.map((dateIso, idx) => {
          const isFirst = idx === 0;
          const isToday = !isDeferred && isFirst;
          return (
            <li
              key={dateIso + "-" + idx}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "8px 0",
                borderBottom: idx < dates.length - 1 ? `1px solid ${THEME.goldDim}` : "none",
                fontSize: 13.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    background: isFirst ? THEME.gold : "rgba(255,255,255,0.05)",
                    color: isFirst ? "#0A0A0A" : THEME.creamMuted,
                    fontSize: 10.5,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ color: isFirst ? THEME.cream : THEME.creamMuted }}>
                  {isToday ? (
                    <strong>Aujourd'hui</strong>
                  ) : (
                    formatFrDateShort(dateIso)
                  )}
                </span>
              </div>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  fontWeight: isFirst ? 600 : 400,
                  color: isFirst ? THEME.goldBright : THEME.creamMuted,
                }}
              >
                {formatEur(amounts[idx])}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Total récap (uniquement si N>1) */}
      {installments > 1 && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${THEME.goldLine}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            color: THEME.creamMuted,
          }}
        >
          <span>Total</span>
          <strong style={{ color: THEME.cream, fontVariantNumeric: "tabular-nums" }}>
            {formatEur(totalEur)}
          </strong>
        </div>
      )}
    </div>
  );
}
