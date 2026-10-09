// Studio vidéo : crée la machine modèle (snapshot Vercel Sandbox) dont partent
// tous les montages. FFmpeg, les bibliothèques Python et Hyperframes (Node, Chrome,
// modèle de détourage, bruitages) y sont déjà installés : une machine démarre en
// quelques secondes au lieu de plusieurs minutes.
//
//   VERCEL_TOKEN=... node scripts/studio-snapshot.mjs
//
// Afficher l'identifiant obtenu, puis le mettre dans la variable d'environnement
// Vercel STUDIO_SNAPSHOT_ID (production). Le code du moteur n'est PAS dans le
// snapshot : chaque montage le télécharge à la version déployée du site.
import { Sandbox } from "@vercel/sandbox";

const FFMPEG = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n9.0-latest-linux64-gpl-9.0.tar.xz";
const PIP = ["numpy", "soundfile", "opencv-python-headless", "pillow"];
const NODE = "https://nodejs.org/dist/v22.20.0/node-v22.20.0-linux-x64.tar.xz";
const HYPERFRAMES = "hyperframes@0.8.143";
// bibliothèques dont Chrome (rendu Hyperframes) a besoin sur Amazon Linux, et une police de secours
const LIBS_CHROME =
  "nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon libXcomposite libXdamage libXfixes libXrandr mesa-libgbm pango cairo alsa-lib libX11 libxcb libXext dejavu-sans-fonts";
// bruitages de la bibliothèque Hyperframes (licence Pixabay : usage commercial permis, pas de
// redistribution à part) : téléchargés ici plutôt que copiés dans le dépôt public
const SONS = "https://raw.githubusercontent.com/heygen-com/hyperframes/v0.8.143/skills/media-use/audio/assets/sfx";
const NOMS_SONS = ["whoosh-short", "sparkle", "chime", "impact-bass-1", "pop", "click-soft", "ping"];

const sbx = await Sandbox.create({
  teamId: "team_VpRsAtUc2ysqZykKIX1jT8D8",
  projectId: "prj_vyHnBgqnWqtXIWj3Y4SNAqsETEMl",
  token: process.env.VERCEL_TOKEN,
  runtime: "python3.13",
  resources: { vcpus: 8 },
  timeout: 30 * 60 * 1000,
  region: "cdg1",
});
const run = async (titre, script) => {
  const r = await sbx.runCommand({ cmd: "bash", args: ["-c", script] });
  const sortie = ((await r.stdout()) + (await r.stderr())).trim().split("\n").slice(-6).join("\n");
  console.log(`${titre} : code ${r.exitCode}${sortie ? `\n${sortie}` : ""}`);
  if (r.exitCode !== 0) throw new Error(titre);
};
try {
  await run("xz", "sudo dnf install -y -q xz >/dev/null");
  await run("ffmpeg", `cd /tmp && curl -sL ${FFMPEG} | tar xJ && sudo cp ffmpeg-*/bin/ffmpeg ffmpeg-*/bin/ffprobe /usr/local/bin/ && rm -rf ffmpeg-* && ffmpeg -hide_banner -filters | grep -cE ' (ass|zscale|arnndn|loudnorm) '`);
  await run("pip", `pip install -q ${PIP.join(" ")} && python -c "import cv2, numpy, soundfile, PIL; print(cv2.__version__)"`);
  await run("node", `cd /tmp && curl -sL ${NODE} | tar xJ && sudo cp -r node-v22*/{bin,lib,include,share} /usr/local/ && rm -rf node-v22* && node -v`);
  await run("bibliothèques chrome", `sudo dnf install -y -q ${LIBS_CHROME} >/dev/null && echo ok`);
  await run("hyperframes", `sudo npm install -g -s ${HYPERFRAMES} && export DO_NOT_TRACK=1 && hyperframes telemetry disable >/dev/null; hyperframes --version`);
  await run("chrome", "export DO_NOT_TRACK=1 && hyperframes browser ensure 2>&1 | tail -1");
  // un premier détourage télécharge le modèle (168 Mo) et onnxruntime une fois pour toutes
  await run(
    "détourage",
    "export DO_NOT_TRACK=1 && cd /tmp && ffmpeg -v error -y -f lavfi -i testsrc2=s=1080x1920:d=0.2:r=30 -c:v libx264 -g 30 essai.mp4 && hyperframes remove-background essai.mp4 -o essai.webm --quality balanced >/dev/null 2>&1; ls -la essai.webm && rm -f essai.mp4 essai.webm",
  );
  await run(
    "bruitages",
    `sudo mkdir -p /opt/studio-sons && cd /opt/studio-sons && for n in ${NOMS_SONS.join(" ")}; do sudo curl -sfL -o $n.mp3 ${SONS}/$n.mp3 || exit 1; done; ls | wc -l`,
  );
  const snap = await sbx.snapshot({ expiration: 0 });
  console.log(`STUDIO_SNAPSHOT_ID=${snap.snapshotId}`);
} catch (e) {
  await sbx.stop();
  throw e;
}
