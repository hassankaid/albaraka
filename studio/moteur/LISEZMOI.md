# Moteur de montage (code de référence de Sidali, 29/09/2026)

Copie **inchangée** du moteur livré avec le cahier des charges du Studio vidéo
(`albaraka_video.zip`). Les corrections de la plateforme ne sont pas faites ici
mais dans `studio/travail.py`, pour garder la trace de ce qui a été livré :

- transcription **par prises** (la voix est découpée aux pauses et chaque prise
  est transcrite seule) : Whisper fondait les phrases recommencées dans un seul
  mot étiré, et elles restaient dans la vidéo ;
- seuil de voix abaissé (`voix - 24 dB` au lieu de `voix - 14 dB`) : les
  syllabes prononcées doucement (« ça » de « ça t'empêche ») étaient rognées ;
- floutage réparti sur tous les processeurs.

Polices : SIL Open Font License. `models/face_detection_yunet_2023mar.onnx` :
OpenCV Zoo (MIT). `models/std.rnnn` : RNNoise (github.com/richardpl/arnndn-models).
