// Studio vidéo : crée la machine modèle (snapshot Vercel Sandbox) dont partent
// tous les montages. FFmpeg et les bibliothèques Python y sont déjà installés :
// une machine démarre en quelques secondes au lieu d'une minute.
//
//   VERCEL_TOKEN=... node scripts/studio-snapshot.mjs
//
// Afficher l'identifiant obtenu, puis le mettre dans la variable d'environnement
// Vercel STUDIO_SNAPSHOT_ID (production). Le code du moteur n'est PAS dans le
// snapshot : chaque montage le télécharge à la version déployée du site.
import { Sandbox } from "@vercel/sandbox";

const FFMPEG = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-n9.0-latest-linux64-gpl-9.0.tar.xz";
const PIP = ["numpy", "soundfile", "opencv-python-headless", "pillow"];

const sbx = await Sandbox.create({
  teamId: "team_VpRsAtUc2ysqZykKIX1jT8D8",
  projectId: "prj_vyHnBgqnWqtXIWj3Y4SNAqsETEMl",
  token: process.env.VERCEL_TOKEN,
  runtime: "python3.13",
  resources: { vcpus: 8 },
  timeout: 15 * 60 * 1000,
  region: "cdg1",
});
const run = async (titre, script) => {
  const r = await sbx.runCommand({ cmd: "bash", args: ["-c", script] });
  const sortie = ((await r.stdout()) + (await r.stderr())).trim();
  console.log(`${titre} : code ${r.exitCode}${sortie ? `\n${sortie}` : ""}`);
  if (r.exitCode !== 0) throw new Error(titre);
};
try {
  await run("xz", "sudo dnf install -y -q xz >/dev/null");
  await run("ffmpeg", `cd /tmp && curl -sL ${FFMPEG} | tar xJ && sudo cp ffmpeg-*/bin/ffmpeg ffmpeg-*/bin/ffprobe /usr/local/bin/ && rm -rf ffmpeg-* && ffmpeg -hide_banner -filters | grep -cE ' (ass|zscale|arnndn|loudnorm) '`);
  await run("pip", `pip install -q ${PIP.join(" ")} && python -c "import cv2, numpy, soundfile, PIL; print(cv2.__version__)"`);
  const snap = await sbx.snapshot({ expiration: 0 });
  console.log(`STUDIO_SNAPSHOT_ID=${snap.snapshotId}`);
} catch (e) {
  await sbx.stop();
  throw e;
}
