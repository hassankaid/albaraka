// ScheduleBlock — Bloc "Calendrier des prélèvements" partagé entre tous les
// checkouts (PaymentLinkCheckout, Checkout AL BARAKA, LibertyCheckout).
//
// Affiche la liste exhaustive des prélèvements avec date + montant pour
// chaque mensualité. En mode différé, propose au client de modifier la
// date de démarrage via un calendrier dropdown au design AL BARAKA (noir/or).
//
// Cas gérés :
//   - 1× immédiat       → mini-rappel "Prélèvement aujourd'hui : X €"
//   - N× immédiat       → calendrier (1re = aujourd'hui, suivantes +1m)
//   - 1× différé        → calendrier avec date du 1er prélèvement (modifiable)
//   - N× différé        → calendrier complet (1re = date différée, suivantes +1m)
//
// IMPORTANT : computeInstallmentDates utilise addMonthsEOMAware pour les
// fins de mois (31 mai → 30 juin, pas 1er juillet).
//
// Le composant ne gère QUE l'affichage. Le state clientChosenStartDate doit
// être hoisté dans le parent qui pourra le passer en prop à create-payment-intent.

import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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
 * Ajoute N mois a une date en respectant la regle "fin de mois colle a fin
 * de mois". Implementation classique des recurrences mensuelles bancaires :
 *   - Si la date de depart est le DERNIER jour de son mois (31 mai, 30 juin,
 *     28/29 fev) → on snap aussi au dernier jour du mois cible.
 *     Ex : 31 mai + 1m = 30 juin (pas 1er juillet)
 *   - Sinon, on prend le meme numero de jour, mais cap au dernier jour du
 *     mois cible si le numero n'existe pas (30 jan + 1m = 28/29 fev, pas 2 mar)
 *   - On calcule TOUJOURS a partir de la date d'origine (pas du resultat
 *     precedent), pour eviter la derive : 30 jan → 28 fev → 28 mar (incorrect),
 *     au lieu de 30 jan → 28 fev → 30 mar (correct).
 */
function addMonthsEOMAware(start: Date, months: number): Date {
  const startDay = start.getDate();
  const startMonth = start.getMonth();
  const startYear = start.getFullYear();
  const lastDayOfStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
  const startIsEOM = startDay === lastDayOfStartMonth;

  const targetTotal = startMonth + months;
  const targetYear = startYear + Math.floor(targetTotal / 12);
  const targetMonthMod = ((targetTotal % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonthMod + 1, 0).getDate();

  const targetDay = startIsEOM
    ? lastDayOfTargetMonth
    : Math.min(startDay, lastDayOfTargetMonth);

  return new Date(targetYear, targetMonthMod, targetDay, 12, 0, 0);
}

/**
 * Calcule les dates de prélèvement de toutes les mensualités.
 * - Mode différé : démarre à startDateIso (date du lien ou choisie par le client).
 * - Mode immédiat : démarre aujourd'hui, +1 mois par mensualité.
 * Retourne un tableau de strings YYYY-MM-DD.
 *
 * Utilise addMonthsEOMAware pour gérer correctement les fins de mois.
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
    const d = addMonthsEOMAware(start, i);
    // toISOString().slice(0,10) ne marche que pour des dates UTC, on construit
    // le YYYY-MM-DD manuellement pour eviter les decalages timezone
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${dd}`);
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
          <DateDarkGoldPicker
            valueIso={clientChosenStartDate || effectiveStartDateIso || ""}
            onChangeIso={(d) => setClientChosenStartDate!(d)}
            minIso={minStartDate!}
            maxIso={maxStartDate!}
          />
          <div
            style={{
              fontSize: 11,
              color: THEME.creamDim,
              marginTop: 6,
              lineHeight: 1.4,
            }}
          >
            Aucun montant n'est débité aujourd'hui — votre carte est seulement
            autorisée.
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

// ─── DateDarkGoldPicker — Calendar shadcn stylé AL BARAKA (noir/or) ───────
// Wrapper qui présente un bouton au design checkout (noir + bordure or +
// gold accent) et ouvre un Popover avec le Calendar shadcn dont les classes
// sont overridées pour matcher le thème AL BARAKA (au lieu du thème global
// shadcn par défaut qui jure avec le design noir/or premium du checkout).
function DateDarkGoldPicker({
  valueIso,
  onChangeIso,
  minIso,
  maxIso,
}: {
  valueIso: string;
  onChangeIso: (iso: string) => void;
  minIso: string;
  maxIso: string;
}) {
  const [open, setOpen] = useState(false);

  // Convertit YYYY-MM-DD en Date a midi (eviter les decalages timezone)
  const isoToDate = (iso: string): Date | undefined =>
    iso ? new Date(`${iso}T12:00:00`) : undefined;

  // Convertit Date en YYYY-MM-DD (en utilisant l'heure locale)
  const dateToIso = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  };

  const selectedDate = isoToDate(valueIso);
  const minDate = isoToDate(minIso)!;
  const maxDate = isoToDate(maxIso)!;

  const displayLabel = valueIso ? formatFrDate(valueIso) : "Choisir une date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 10,
            border: `1px solid ${THEME.goldDim}`,
            background: "rgba(255,255,255,0.02)",
            color: THEME.cream,
            fontSize: 14,
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            cursor: "pointer",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <CalendarIcon size={16} style={{ color: THEME.gold }} />
            <span>{displayLabel}</span>
          </span>
          <ChevronDown size={14} style={{ color: THEME.creamDim }} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 border-0"
        style={{
          background: "#0A0A0A",
          border: `1px solid ${THEME.goldLine}`,
          boxShadow: "0 30px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,78,0.1)",
          borderRadius: 12,
        }}
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => {
            if (d) {
              onChangeIso(dateToIso(d));
              setOpen(false);
            }
          }}
          disabled={(d) => d < minDate || d > maxDate}
          defaultMonth={selectedDate}
          initialFocus
          weekStartsOn={1}
          className="p-3"
          classNames={{
            months: "flex flex-col",
            month: "space-y-3",
            caption: "flex justify-center pt-1 relative items-center text-[#F5F1E6]",
            caption_label: "text-sm font-medium capitalize",
            nav: "space-x-1 flex items-center",
            nav_button:
              "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 hover:bg-[rgba(201,160,78,0.1)] rounded-md text-[#C9A04E]",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex",
            head_cell:
              "text-[rgba(245,241,230,0.5)] rounded-md w-8 font-normal text-[0.72rem] uppercase",
            row: "flex w-full mt-1",
            cell: "h-8 w-8 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
            day:
              "h-8 w-8 p-0 font-normal text-[#F5F1E6] hover:bg-[rgba(201,160,78,0.12)] rounded-md transition-colors",
            day_range_end: "day-range-end",
            day_selected:
              "bg-[#C9A04E] text-[#0A0A0A] font-semibold hover:bg-[#E4C57A] hover:text-[#0A0A0A] focus:bg-[#C9A04E] focus:text-[#0A0A0A]",
            day_today: "border border-[rgba(201,160,78,0.5)] text-[#E4C57A]",
            day_outside: "text-[rgba(245,241,230,0.25)] opacity-50",
            day_disabled: "text-[rgba(245,241,230,0.2)] opacity-40 cursor-not-allowed",
            day_range_middle: "aria-selected:bg-[rgba(201,160,78,0.15)] aria-selected:text-[#F5F1E6]",
            day_hidden: "invisible",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

