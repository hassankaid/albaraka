// Une tuile de témoignage : capture d'écran, vidéo Vimeo ou fichier hébergé.
//
// Une SEULE tuile pour les trois formes, volontairement : la page les mélange
// dans un mur unique, et deux composants aux cadres légèrement différents s'y
// verraient immédiatement.
import { T } from "../theme";
import { testimonialVimeoUrl, type Testimonial } from "../lib/testimonials";
import { useVisibleOnce } from "../lib/useVisibleOnce";

const frame: React.CSSProperties = {
  position: "relative",
  borderRadius: 16,
  overflow: "hidden",
  border: `1px solid ${T.goldLine}`,
  background: "#000",
  boxShadow: "0 18px 44px rgba(0,0,0,0.45), 0 0 0 1px rgba(201,160,78,0.08)",
};

export default function TestimonialTile({ item }: { item: Testimonial }) {
  // Le lecteur n'est monté qu'à l'approche de l'écran. L'attribut natif
  // `loading="lazy"` ne suffisait pas : mesuré, les 11 lecteurs se
  // chargeaient tous d'emblée (4,2 Mo sur mobile). Voir `useVisibleOnce`.
  const { ref, visible } = useVisibleOnce<HTMLElement>();

  return (
    <figure ref={ref} style={{ margin: 0 }}>
      {item.kind === "capture" ? (
        // Ni recadrage ni hauteur imposée : une capture d'avis est du TEXTE,
        // la rogner la rendrait illisible.
        <div style={{ ...frame, background: "rgba(255,255,255,0.03)" }}>
          <img
            src={item.src}
            alt={item.alt ?? item.title}
            loading="lazy"
            decoding="async"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        </div>
      ) : (
        <div style={{ ...frame, aspectRatio: item.ratio ?? "16 / 9" }}>
          {!visible ? (
            // Cadre d'attente, aux MÊMES proportions : la page ne bouge pas
            // d'un pixel au montage du lecteur. En pratique le visiteur ne le
            // voit jamais, le chargement étant déclenché 800 px en amont.
            <div aria-hidden style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill={T.goldDim}>
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          ) : item.kind === "vimeo" ? (
            <iframe
              src={testimonialVimeoUrl(item)}
              // La page en aligne une douzaine : sans chargement différé, le
              // visiteur paierait douze lecteurs Vimeo avant d'en voir un.
              loading="lazy"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title={item.title}
            />
          ) : (
            <video
              src={item.src}
              poster={item.poster}
              controls
              playsInline
              preload="metadata"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
            />
          )}
        </div>
      )}

      <figcaption style={{ margin: "12px 2px 0", textAlign: "center" }}>
        <div style={{ fontFamily: T.display, fontWeight: 600, fontSize: "0.98rem", lineHeight: 1.35, color: T.cream }}>
          {item.title}
        </div>
        {item.kind !== "capture" && item.author && (
          <div style={{ fontFamily: T.body, fontSize: "0.76rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T.goldBright, marginTop: 6 }}>
            {item.author}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
