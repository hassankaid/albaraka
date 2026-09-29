// ─────────────────────────────────────────────────────────────────────────
// L'agenda Calendly du site vitrine, à la place du formulaire (demande de
// Hassan le 29/09/2026). Le visiteur choisit directement son créneau.
//
// Agenda « SITE WEB AL BARAKA » (round-robin, 30 min, téléphone obligatoire),
// UUID 655fa72e-bde0-4a12-a6bf-b10cf1d5fe68. Le webhook Calendly le reconnaît
// et crée le lead « Site vitrine » dans le CRM, titulaire = le commercial
// désigné pour l'appel.
//
// Choix d'intégration :
//  • une simple iframe, SANS le script widget.js de Calendly : rien ne se
//    charge depuis Calendly tant que le visiteur n'approche pas de la section
//    (`loading="lazy"`), et aucun script tiers ne tourne sur la page ;
//  • les UTM captés à l'arrivée sont transmis à Calendly, qui les renvoie dans
//    le webhook (`tracking`) : l'origine du lead est conservée ;
//  • Calendly signale la hauteur de sa page (`calendly.page_height`) : on s'y
//    ajuste, pour éviter une barre de défilement dans la section.
// ─────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";
import { capterAttribution, type Attribution } from "../api";

export const LIEN_AGENDA = "https://calendly.com/d/dz73-r3j-q2v/site-web-al-baraka";

/** Couleurs du site, sans « # » comme l'attend Calendly. */
const COULEURS = { background_color: "0c0b08", text_color: "f3eee4", primary_color: "d8b85e" };

export function urlAgenda(attribution: Attribution | null, domaine: string): string {
  const p = new URLSearchParams({
    embed_type: "Inline",
    embed_domain: domaine,
    hide_event_type_details: "1",
    ...COULEURS,
  });
  if (attribution) {
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
      if (attribution[k]) p.set(k, attribution[k]!);
    }
  }
  return `${LIEN_AGENDA}?${p.toString()}`;
}

/** Hauteur annoncée par Calendly dans un message, ou null. */
export function hauteurCalendly(message: unknown): number | null {
  const m = message as { event?: string; payload?: { height?: string | number } } | null;
  if (!m || m.event !== "calendly.page_height") return null;
  const h = parseInt(String(m.payload?.height ?? ""), 10);
  return Number.isFinite(h) && h > 200 && h < 3000 ? h : null;
}

export default function AgendaCalendly() {
  const [hauteur, setHauteur] = useState<number | null>(null);
  const cadre = useRef<HTMLIFrameElement>(null);
  // capterAttribution et non lireAttribution : l'agenda est rendu AVANT l'effet
  // de VitrineApp qui capte les UTM de l'arrivée. Lire seulement la session
  // donnerait un agenda sans UTM à la première visite. La capture est
  // idempotente (première touche conservée).
  const [src] = useState(() => urlAgenda(capterAttribution(), window.location.host));

  useEffect(() => {
    const ecouter = (e: MessageEvent) => {
      if (e.origin !== "https://calendly.com" || e.source !== cadre.current?.contentWindow) return;
      const h = hauteurCalendly(e.data);
      if (h) setHauteur(h);
    };
    window.addEventListener("message", ecouter);
    return () => window.removeEventListener("message", ecouter);
  }, []);

  return (
    <div className="v-agenda">
      <iframe
        ref={cadre}
        src={src}
        title="Choisir un créneau de rendez-vous"
        loading="lazy"
        className="v-agenda-cadre"
        style={hauteur ? { height: hauteur } : undefined}
      />
    </div>
  );
}
