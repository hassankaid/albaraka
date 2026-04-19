import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TOTAL_EUR = 2500;

const BRAND = {
  gold: "#C9A04E",
  goldSoft: "rgba(201,160,78,0.28)",
  goldMuted: "rgba(201,160,78,0.03)",
  cream: "#F5F1E6",
  creamMuted: "rgba(245,241,230,0.65)",
  creamSoft: "rgba(245,241,230,0.9)",
  black: "#0A0A0A",
};

function formatEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);
}

type CouponState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "valid"; code: string; percent: number }
  | { status: "invalid"; reason: string };

export default function Checkout() {
  const params = useParams();
  const navigate = useNavigate();
  const parsedInstallments = Number(params.installments);
  const initialInstallments =
    Number.isInteger(parsedInstallments) && parsedInstallments >= 1 && parsedInstallments <= 8
      ? parsedInstallments
      : 1;

  const [installments, setInstallments] = useState(initialInstallments);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<CouponState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const discountPercent = coupon.status === "valid" ? coupon.percent : 0;
  const totalAfterDiscount = useMemo(
    () => Math.round((TOTAL_EUR * (100 - discountPercent)) / 100 * 100) / 100,
    [discountPercent],
  );
  const perInstallment = useMemo(
    () => Math.round((totalAfterDiscount / installments) * 100) / 100,
    [totalAfterDiscount, installments],
  );

  function onSelectInstallments(n: number) {
    setInstallments(n);
    navigate(`/checkout/${n}`, { replace: true });
  }

  async function onApplyCoupon() {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCoupon({ status: "validating" });
    const { data, error } = await supabase.rpc("validate_coupon", { p_code: code });
    if (error) {
      console.error(error);
      setCoupon({ status: "invalid", reason: "error" });
      toast.error("Erreur lors de la vérification du code");
      return;
    }
    const v = data as { valid: boolean; code?: string; discount_percent?: number; reason?: string };
    if (v?.valid && v.code && typeof v.discount_percent === "number") {
      setCoupon({ status: "valid", code: v.code, percent: v.discount_percent });
      toast.success(`Code ${v.code} appliqué — ${v.discount_percent}% de réduction`);
    } else {
      setCoupon({ status: "invalid", reason: v?.reason || "not_found" });
      toast.error("Code promo invalide");
    }
  }

  async function onSubmit() {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ url: string; error?: string }>(
        "create-checkout-session",
        {
          body: {
            installments,
            coupon_code: coupon.status === "valid" ? coupon.code : undefined,
          },
        },
      );
      if (error) throw error;
      if (!data?.url) throw new Error(data?.error || "Réponse Stripe invalide");
      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erreur lors de la création du paiement";
      toast.error(msg);
      setSubmitting(false);
    }
  }

  const planLabel = installments === 1 ? "Paiement en 1 fois" : `Paiement en ${installments} fois`;
  const perInstallmentLabel =
    installments === 1
      ? formatEur(totalAfterDiscount)
      : `${formatEur(perInstallment)} × ${installments}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND.black,
        color: BRAND.cream,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
        padding: "3rem 1.5rem",
      }}
    >
      <style>{`
        .alb-checkout input {
          background: rgba(255,255,255,0.03);
          border: 0.5px solid ${BRAND.goldSoft};
          color: ${BRAND.cream};
          padding: 13px 14px;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
          width: 100%;
          transition: border-color 0.2s;
        }
        .alb-checkout input::placeholder { color: rgba(245,241,230,0.35); }
        .alb-checkout input:focus { outline: none; border-color: ${BRAND.gold}; background: rgba(255,255,255,0.05); }
        .alb-plan-btn {
          background: transparent;
          border: 0.5px solid ${BRAND.goldSoft};
          color: ${BRAND.creamSoft};
          padding: 14px 8px;
          border-radius: 6px;
          font-size: 13px;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .alb-plan-btn:hover { border-color: ${BRAND.gold}; color: ${BRAND.cream}; }
        .alb-plan-btn.active {
          background: ${BRAND.gold};
          color: ${BRAND.black};
          border-color: ${BRAND.gold};
          font-weight: 500;
        }
        .alb-btn {
          width: 100%;
          background: ${BRAND.gold};
          color: ${BRAND.black};
          border: none;
          border-radius: 8px;
          padding: 17px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 3px;
          font-family: inherit;
          transition: background 0.2s, opacity 0.2s;
        }
        .alb-btn:hover:not(:disabled) { background: #DDB968; }
        .alb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .alb-coupon-btn {
          background: transparent;
          border: 0.5px solid ${BRAND.gold};
          color: ${BRAND.gold};
          padding: 13px 18px;
          border-radius: 6px;
          font-size: 12px;
          letter-spacing: 2px;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: background 0.2s;
        }
        .alb-coupon-btn:hover:not(:disabled) { background: ${BRAND.goldMuted}; }
        .alb-coupon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div
        className="alb-checkout"
        style={{
          maxWidth: 520,
          margin: "0 auto",
          padding: "3rem 2rem",
          border: `0.5px solid rgba(201,160,78,0.2)`,
          borderRadius: 12,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2.25rem" }}>
          <div
            style={{
              width: 72,
              height: 72,
              margin: "0 auto 20px",
              background: BRAND.black,
              border: `1px solid ${BRAND.gold}`,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40">
              <text
                x="20"
                y="28"
                textAnchor="middle"
                fontFamily="Georgia, serif"
                fontSize="22"
                fontWeight="400"
                fill={BRAND.gold}
                letterSpacing="1.5"
              >
                AB
              </text>
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, letterSpacing: 6, color: BRAND.cream, marginBottom: 6 }}>
            AL BARAKA
          </div>
          <div style={{ fontSize: 10, color: BRAND.gold, letterSpacing: 3 }}>
            ÉCOSYSTÈME BY ETHICARENA
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 22 }}>
            <div style={{ width: 70, height: 0.5, background: BRAND.gold }} />
            <svg width="8" height="8" viewBox="0 0 8 8">
              <path d="M4 0L8 4L4 8L0 4Z" fill={BRAND.gold} />
            </svg>
            <div style={{ width: 70, height: 0.5, background: BRAND.gold }} />
          </div>
        </div>

        <h1
          style={{
            fontSize: 24,
            fontWeight: 500,
            margin: "0 0 18px 0",
            letterSpacing: 2.5,
            textAlign: "center",
            fontFamily: "Georgia, serif",
            color: BRAND.cream,
          }}
        >
          PASS AL BARAKA
        </h1>

        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <p style={{ color: "rgba(245,241,230,0.8)", fontSize: 14, margin: 0, lineHeight: 1.85 }}>
            Bienvenue dans l'écosystème Al Baraka. Tu prends la bonne décision, qu'Allah te facilite ton cheminement. Nous serons avec toi jusqu'au bout.
          </p>
          <p style={{ color: BRAND.gold, fontSize: 11, margin: "18px 0 0 0", fontWeight: 500, letterSpacing: 4 }}>
            — FÉLICITATIONS —
          </p>
        </div>

        <div style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, margin: "0 0 16px 0", letterSpacing: 3, color: BRAND.gold }}>
            CE QUE TU REJOINS
          </h2>
          <p style={{ color: BRAND.creamMuted, fontSize: 13, lineHeight: 1.75, margin: "0 0 18px 0" }}>
            Avec le PASS AL BARAKA, tu ne rejoins pas une simple formation — tu intègres un écosystème complet pensé pour t'accompagner dans la durée :
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {[
              "Accès à plusieurs programmes pour développer des compétences variées et complémentaires",
              "Un accompagnement sur mesure par nos coachs dédiés",
              "Une communauté active de frères et sœurs animés par les mêmes ambitions",
              "Des outils d'intelligence artificielle inclus dans ton offre",
              "Des perspectives d'évolution claires pour progresser pas à pas",
            ].map((item, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 11, fontSize: 13, lineHeight: 1.6, color: BRAND.creamSoft }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 14 14"
                  style={{ flexShrink: 0, marginTop: 4 }}
                >
                  <path
                    d="M2 7L5.5 10.5L12 4"
                    fill="none"
                    stroke={BRAND.gold}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, margin: "0 0 16px 0", letterSpacing: 3, color: BRAND.gold }}>
            PLAN DE PAIEMENT
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <button
                key={n}
                type="button"
                className={`alb-plan-btn ${installments === n ? "active" : ""}`}
                onClick={() => onSelectInstallments(n)}
              >
                {n === 1 ? "1 fois" : `${n} fois`}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: 11, fontWeight: 500, margin: "0 0 12px 0", letterSpacing: 3, color: BRAND.gold }}>
            CODE PROMO
          </h2>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="Entrer un code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              disabled={coupon.status === "valid"}
              style={{ textTransform: "uppercase" }}
            />
            {coupon.status === "valid" ? (
              <button
                type="button"
                className="alb-coupon-btn"
                onClick={() => {
                  setCoupon({ status: "idle" });
                  setCouponInput("");
                }}
              >
                RETIRER
              </button>
            ) : (
              <button
                type="button"
                className="alb-coupon-btn"
                onClick={onApplyCoupon}
                disabled={coupon.status === "validating" || !couponInput.trim()}
              >
                {coupon.status === "validating" ? "…" : "APPLIQUER"}
              </button>
            )}
          </div>
          {coupon.status === "valid" && (
            <p style={{ color: BRAND.gold, fontSize: 12, margin: "8px 0 0 0" }}>
              ✓ Code {coupon.code} appliqué — {coupon.percent}% de réduction
            </p>
          )}
        </div>

        <div
          style={{
            marginBottom: "2.5rem",
            padding: "18px 20px",
            border: `0.5px solid ${BRAND.goldSoft}`,
            borderRadius: 8,
            background: BRAND.goldMuted,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
            <span style={{ color: "rgba(245,241,230,0.6)" }}>Programme</span>
            <span style={{ fontWeight: 500, color: BRAND.cream }}>PASS AL BARAKA</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
            <span style={{ color: "rgba(245,241,230,0.6)" }}>Accès</span>
            <span style={{ fontWeight: 500, color: BRAND.cream }}>Immédiat après paiement</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
            <span style={{ color: "rgba(245,241,230,0.6)" }}>Modalité</span>
            <span style={{ fontWeight: 500, color: BRAND.cream }}>{planLabel}</span>
          </div>
          {discountPercent > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "rgba(245,241,230,0.6)" }}>Montant initial</span>
                <span
                  style={{
                    color: "rgba(245,241,230,0.5)",
                    textDecoration: "line-through",
                  }}
                >
                  {formatEur(TOTAL_EUR)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "5px 0",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "rgba(245,241,230,0.6)" }}>Réduction ({discountPercent}%)</span>
                <span style={{ fontWeight: 500, color: BRAND.gold }}>
                  − {formatEur(TOTAL_EUR - totalAfterDiscount)}
                </span>
              </div>
            </>
          )}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0 2px 0",
              fontSize: 15,
              borderTop: "0.5px solid rgba(201,160,78,0.25)",
              marginTop: 8,
            }}
          >
            <span style={{ color: BRAND.cream }}>Montant</span>
            <span style={{ fontWeight: 500, color: BRAND.gold, letterSpacing: 1 }}>
              {perInstallmentLabel}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="alb-btn"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? "REDIRECTION…" : `VALIDER — ${formatEur(totalAfterDiscount)}`}
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: "1.25rem",
            fontSize: 11,
            color: "rgba(245,241,230,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            letterSpacing: 1,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
            <rect x="2.5" y="6" width="9" height="6.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4.5 6V4C4.5 2.5 5.5 1.5 7 1.5C8.5 1.5 9.5 2.5 9.5 4V6" fill="none" stroke="currentColor" strokeWidth="1.2" />
          </svg>
          <span>PAIEMENT SÉCURISÉ · STRIPE</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: "2rem" }}>
          <div style={{ width: 50, height: 0.5, background: "rgba(201,160,78,0.4)" }} />
          <svg width="6" height="6" viewBox="0 0 8 8">
            <path d="M4 0L8 4L4 8L0 4Z" fill="rgba(201,160,78,0.5)" />
          </svg>
          <div style={{ width: 50, height: 0.5, background: "rgba(201,160,78,0.4)" }} />
        </div>
      </div>
    </div>
  );
}
