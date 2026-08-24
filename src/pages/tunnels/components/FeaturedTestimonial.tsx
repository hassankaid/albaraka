// Bloc « pièce maîtresse » : une vidéo mise en avant, plus large que les
// tuiles du mur, avec son intitulé AU-DESSUS.
//
// Sert à la compilation des témoignages, présente sur les deux pages. Elle
// n'est pas un témoignage parmi d'autres : douze minutes bout à bout, c'est
// une entrée en matière — la noyer dans le mur l'aurait rendue invisible, et
// une tuile de douze minutes au milieu de clips d'une minute est trompeuse.
//
// La durée est annoncée : le visiteur doit savoir ce qu'il engage avant de
// lancer la lecture.
import { T } from "../theme";
import { testimonialVimeoUrl, type VimeoTestimonial } from "../lib/testimonials";

export default function FeaturedTestimonial({
  video,
  eyebrow,
  title,
  duree,
}: {
  video: VimeoTestimonial;
  eyebrow: string;
  title: string;
  duree?: string;
}) {
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ textAlign: "center", margin: "0 auto 22px" }}>
        <div style={{ fontFamily: T.body, fontWeight: 600, letterSpacing: "0.2em", textTransform: "uppercase", fontSize: "0.7rem", color: T.goldBright, marginBottom: 10 }}>
          {eyebrow}
        </div>
        <h2 style={{ fontFamily: T.display, fontWeight: 600, fontSize: "clamp(1.35rem,3.8vw,1.9rem)", lineHeight: 1.2, color: T.cream, margin: 0 }}>
          {title}
        </h2>
        {duree && (
          <div style={{ fontFamily: T.body, fontSize: "0.78rem", color: T.creamDim, marginTop: 10 }}>
            {duree}
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          aspectRatio: video.ratio ?? "16 / 9",
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${T.goldLine}`,
          background: "#000",
          boxShadow: "0 30px 70px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,160,78,0.1)",
        }}
      >
        <iframe
          src={testimonialVimeoUrl(video)}
          // Elle est en haut de page : contrairement aux tuiles du mur, on ne
          // diffère pas son chargement, c'est la première chose qu'on regarde.
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={video.title}
        />
      </div>
    </figure>
  );
}
