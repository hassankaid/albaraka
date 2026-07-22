// Lecteur vidéo Vimeo du module tunnels — responsive 16:9, encadré or.
// Pas de gating (les CTA sont visibles tout de suite, cf. décision Hassan) :
// c'est un simple embed propre.
import { T } from "../theme";
import { vimeoEmbedUrl, type TunnelVariant } from "../variants";

export default function VimeoVideo({ variant }: { variant: TunnelVariant }) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        borderRadius: 16,
        overflow: "hidden",
        border: `1px solid ${T.goldLine}`,
        background: "#000",
        boxShadow: "0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,160,78,0.08)",
      }}
    >
      <iframe
        key={variant.vimeoId}
        src={vimeoEmbedUrl(variant)}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title="Conférence Al Baraka"
      />
    </div>
  );
}
