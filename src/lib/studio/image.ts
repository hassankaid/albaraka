// Image tirée du fichier vidéo local, pour l'aperçu avant que la machine ait préparé la sienne.
/** Image de la vidéo locale à l'instant t (null si le navigateur ne sait pas la lire, ex. HEVC). */
export function imageDuFichier(fichier: File, t?: number): Promise<HTMLCanvasElement | null> {
  return new Promise((ok) => {
    const url = URL.createObjectURL(fichier);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    const fin = (c: HTMLCanvasElement | null) => {
      URL.revokeObjectURL(url);
      ok(c);
    };
    v.onloadedmetadata = () => {
      v.currentTime = t ?? Math.min(v.duration * 0.3, Math.max(0, v.duration - 0.5));
    };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d")!.drawImage(v, 0, 0);
      fin(c.width ? c : null);
    };
    v.onerror = () => fin(null);
    setTimeout(() => fin(null), 15000);
    v.src = url;
  });
}
