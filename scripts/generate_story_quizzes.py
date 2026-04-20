#!/usr/bin/env python3
"""
Génère la migration SQL pour les 9 quiz Storytelling (M1-M8 + Final)
à partir du doc client (format TypeScript Lovable) extrait.

Le format du doc Storytelling est légèrement différent de Personal Branding :
    { q: "...", options: [...], answer: N }
au lieu de
    { id: ..., module: N, question: "...", options: [...], correctIndex: N, explanation: "..." }

Pas d'explications dans le doc source → on met une chaîne vide.
"""

import re
import json
import sys
import io
import xml.etree.ElementTree as ET
import os

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DOCX_XML = os.path.join(
    os.environ.get("STORY_EXTRACT_DIR", "/tmp/story_extract"),
    "word", "document.xml",
)

# Extrait le texte du .docx
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
lines = []
with open(DOCX_XML, encoding="utf-8") as f:
    root = ET.fromstring(f.read())
for p in root.iter(f"{{{NS['w']}}}p"):
    line = "".join(t.text or "" for t in p.iter(f"{{{NS['w']}}}t"))
    if line.strip():
        lines.append(line)
src = "\n".join(lines)

# Parse questions au format { q:"...", options:[...], answer:N }
QUESTION_RE = re.compile(
    r'\{\s*q:\s*"((?:[^"\\]|\\.)*)",\s*options:\s*\[((?:"(?:[^"\\]|\\.)*",?\s*)+)\],\s*answer:\s*(\d+)\s*\}',
    re.MULTILINE,
)
OPTION_RE = re.compile(r'"((?:[^"\\]|\\.)*)"')

def unescape(s: str) -> str:
    return s.replace('\\"', '"').replace("\\\\", "\\").replace("\\n", "\n")

def parse_questions_in(block: str):
    out = []
    for m in QUESTION_RE.finditer(block):
        out.append({
            "question": unescape(m.group(1)),
            "options": [unescape(x.group(1)) for x in OPTION_RE.finditer(m.group(2))],
            "correct_index": int(m.group(3)),
            "explication": "",
        })
    return out

# Extrait chaque bloc module / final
def extract_block(key: str):
    """Extrait le contenu entre `key: {` et le prochain `moduleN: {` ou `final...: {`."""
    m = re.search(rf'\b{re.escape(key)}\s*:\s*\{{', src)
    if not m:
        return ""
    start = m.end()
    # Trouve la prochaine section
    rest = src[start:]
    next_m = re.search(r'\b(module\d+|final(?:Quiz)?)\s*:\s*\{', rest)
    return rest[:next_m.start()] if next_m else rest

modules = {}
for i in range(1, 9):
    block = extract_block(f"module{i}")
    modules[i] = parse_questions_in(block)

final_block = extract_block("final")
final_qs = parse_questions_in(final_block)

# Mapping chapitre_id (récupéré via SQL DB)
CHAPTER_IDS = {
    1: "aa561fd3-1cc5-4fd1-b0f5-0610157483a8",  # Fondements & Neuroscience
    2: "c6014cb1-1035-418b-b29a-b802ac811103",  # Structures Narratives
    3: "a64567be-152a-4d7c-84de-0b46e6750cbe",  # Personnages & Transformation
    4: "a7877285-3927-4ebd-9815-039c17b5987b",  # Techniques Narratives Avancées
    5: "f5e11146-33a2-4c62-a7f5-568c6e07937f",  # Business & Marque
    6: "014cf223-6ef0-436f-9eda-960991646218",  # Réseaux Sociaux
    7: "291fa0a8-146b-491b-b81c-3fae255477ce",  # Vendre
    8: "e07b8cec-634e-4f9e-9dce-b678dd5ec5b5",  # Oral, Vidéo & Pitch
}
FORMATION_ID = "a9af0dd2-f876-4971-990f-7f91bf3e601a"

MODULE_TITLES = {
    1: "Module 1 — Fondements & Neuroscience",
    2: "Module 2 — Structures Narratives",
    3: "Module 3 — Personnages & Transformation",
    4: "Module 4 — Techniques Narratives Avancées",
    5: "Module 5 — Storytelling Business & Marque",
    6: "Module 6 — Storytelling Réseaux Sociaux",
    7: "Module 7 — Storytelling pour Vendre",
    8: "Module 8 — Storytelling Oral, Vidéo & Pitch",
}

def emit_import(titre, description, questions, max_errors, chapitre_id=None, formation_id=None):
    payload = {
        "titre": titre,
        "description": description,
        "max_errors": max_errors,
        "status": "published",
        "questions": questions,
    }
    if chapitre_id:
        payload["chapitre_id"] = chapitre_id
    if formation_id:
        payload["formation_id"] = formation_id
    payload_json = json.dumps(payload, ensure_ascii=False)
    return f"SELECT public.import_quiz_from_json($quiz${payload_json}$quiz$::jsonb);\n"

out = []
out.append("-- Quiz Storytelling — 8 quiz de module + 1 quiz de validation finale.")
out.append("-- Généré par scripts/generate_story_quizzes.py à partir du doc client.")
out.append("-- Même modèle que Personal Branding / Muslim Mindset : quiz attachés aux chapitres.")
out.append("")

# 8 module quizzes
for mod in range(1, 9):
    qs = modules.get(mod, [])
    if not qs:
        print(f"[WARN] Module {mod} empty", file=sys.stderr)
    titre = f"Quiz Storytelling — {MODULE_TITLES[mod]}"
    desc = f"{len(qs)} questions. Valide ce quiz pour débloquer la suite de la formation."
    out.append(emit_import(titre, desc, qs, max_errors=3, chapitre_id=CHAPTER_IDS[mod]))
    print(f"[INFO] Module {mod} : {len(qs)} questions", file=sys.stderr)

# Final quiz
if final_qs:
    out.append(emit_import(
        titre="Quiz Storytelling — Validation Finale",
        description=f"{len(final_qs)} questions de synthèse. Valide ce quiz pour finaliser la formation.",
        questions=final_qs,
        max_errors=3,
        formation_id=FORMATION_ID,
    ))
    print(f"[INFO] Final : {len(final_qs)} questions", file=sys.stderr)

print("".join(out))
