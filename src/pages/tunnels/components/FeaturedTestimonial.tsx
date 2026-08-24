// Vidéo mise en avant : le lecteur, et rien d'autre.
//
// Sert à la compilation des témoignages, présente sur les deux pages. Elle
// n'est pas un témoignage parmi d'autres — douze minutes au milieu de clips
// d'une minute serait trompeur — d'où un cadre plus large, hors du mur.
//
// Pas d'intitulé au-dessus, volontairement : chaque page en porte déjà un
// (le titre de la page témoignages, le libellé de section sur la landing),
// et empiler un troisième titre repoussait la vidéo plus bas que le premier
// écran. Seule la durée subsiste, discrète et SOUS le lecteur : le visiteur
// doit savoir ce qu'il engage, sans que ça retarde ce qu'il est venu voir.
import { T } from "../theme";
import { testimonialVimeoUrl, type VimeoTestimonial } from "../lib/testimonials";

export default function FeaturedTestimonial({
  video,
  duree,
}: {
  video: VimeoTestimonial;
  duree?: string;
}) {
  return (
    <figure style={{ margin: 0 }}>
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
      {duree && (
        <figcaption style={{ marginTop: 12, textAlign: "center", fontFamily: T.body, fontSize: "0.76rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T.creamDim }}>
          {duree}
        </figcaption>
      )}
    </figure>
  );
}
