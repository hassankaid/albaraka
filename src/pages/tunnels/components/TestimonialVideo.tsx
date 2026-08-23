// Lecteur d'un témoignage vidéo — Vimeo ou fichier hébergé, cadre à la marque.
// Partagé par la vitrine `/temoignages` et la landing des tunnels.
import { T } from "../theme";
import { testimonialVimeoUrl, type VideoTestimonial } from "../lib/testimonials";

export default function TestimonialVideo({ video }: { video: VideoTestimonial }) {
  const ratio = video.ratio ?? "16 / 9";
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          position: "relative",
          aspectRatio: ratio,
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${T.goldLine}`,
          background: "#000",
          boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,160,78,0.08)",
        }}
      >
        {video.kind === "vimeo" ? (
          <iframe
            src={testimonialVimeoUrl(video)}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title={video.title}
          />
        ) : (
          <video
            src={video.src}
            poster={video.poster}
            controls
            playsInline
            // Ne précharge que les métadonnées : la page en affiche plusieurs,
            // tout charger d'un coup coûterait cher au visiteur mobile.
            preload="metadata"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
          />
        )}
      </div>
      <figcaption style={{ marginTop: 12, textAlign: "center" }}>
        <div style={{ fontFamily: T.display, fontWeight: 600, fontSize: "1rem", lineHeight: 1.3, color: T.cream }}>
          {video.title}
        </div>
        {video.author && (
          <div style={{ fontFamily: T.body, fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T.goldBright, marginTop: 6 }}>
            {video.author}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
