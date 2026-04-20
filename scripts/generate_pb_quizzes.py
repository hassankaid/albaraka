#!/usr/bin/env python3
"""
Génère la migration SQL pour les 9 quiz Personal Branding (M1-M8 + Final)
à partir du doc client (format TypeScript Lovable) extrait.

Usage :
    python scripts/generate_pb_quizzes.py > supabase/migrations/20260420190000_quiz_personal_branding.sql
"""

import re
import json
import sys
import io
import xml.etree.ElementTree as ET

# Force stdout en UTF-8 pour Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

import os as _os
DOCX_XML = _os.path.join(_os.environ.get("PB_EXTRACT_DIR", "/tmp/pb_extract_final"), "word", "document.xml")

# Extrait le texte depuis le document.xml (un paragraphe par ligne)
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
lines = []
with open(DOCX_XML, encoding="utf-8") as f:
    root = ET.fromstring(f.read())
for p in root.iter(f"{{{NS['w']}}}p"):
    texts = ["".join(t.text or "" for t in p.iter(f"{{{NS['w']}}}t"))]
    line = "".join(texts)
    if line.strip():
        lines.append(line)
src = "\n".join(lines)

# Regex pour chopper les objets question : { id:"...", module:N, question:"...", options:[...], correctIndex:N, explanation:"..." }
QUESTION_RE = re.compile(
    r'\{\s*id:"([^"]+)",\s*module:(\d+),\s*question:"((?:[^"\\]|\\.)*)",\s*options:\[((?:"(?:[^"\\]|\\.)*",?\s*)+)\],\s*correctIndex:(\d+),\s*explanation:"((?:[^"\\]|\\.)*)"\s*\}',
    re.MULTILINE,
)
OPTION_RE = re.compile(r'"((?:[^"\\]|\\.)*)"')

def unescape(s: str) -> str:
    return s.replace('\\"', '"').replace("\\\\", "\\").replace("\\n", "\n")

def parse_questions(text: str):
    out = []
    for m in QUESTION_RE.finditer(text):
        q = {
            "id": m.group(1),
            "module": int(m.group(2)),
            "question": unescape(m.group(3)),
            "options": [unescape(x.group(1)) for x in OPTION_RE.finditer(m.group(4))],
            "correct_index": int(m.group(5)),
            "explication": unescape(m.group(6)),
        }
        out.append(q)
    return out

# Extract all questions, including transversal ones (module 0)
all_qs = parse_questions(src)

# Group by module
by_module = {}
for q in all_qs:
    by_module.setdefault(q["module"], []).append(q)

# Chapter IDs (taken from DB query)
CHAPTER_IDS = {
    1: "e16e0cdd-482e-42bd-9e91-b515db8cede9",
    2: "615f8250-9a10-4e68-8e68-649932b0669e",
    3: "289acce1-dc47-4f95-92eb-a44b64b95536",
    4: "4c6fef16-6f4f-4da6-99c9-289ae88d0af8",
    5: "ea5c0a18-8dfb-4e73-ad17-131e012daebb",
    6: "f7a9c939-89a1-4e7a-9a47-1964ecdbb483",
    7: "b6a389ca-e1b9-45ed-a6ff-e9e18357d130",
    8: "d17a9be5-fdf8-47ab-bae4-751db8c68171",
}
FORMATION_ID = "d31a7726-6468-44ca-b07c-847e29b43ebc"

MODULE_TITLES = {
    1: "Module 1 — Fondements & Philosophie",
    2: "Module 2 — Identité & Positionnement",
    3: "Module 3 — Identité Visuelle & Signature",
    4: "Module 4 — Stratégie de Contenu",
    5: "Module 5 — Plateformes & Algorithmes",
    6: "Module 6 — Storytelling & Authenticité",
    7: "Module 7 — Communauté & Réseau",
    8: "Module 8 — Autorité & Monétisation",
}

def q_to_payload(q):
    return {
        "question": q["question"],
        "options": q["options"],
        "correct_index": q["correct_index"],
        "explication": q["explication"],
    }

def emit_import(titre, description, questions, max_errors, chapitre_id=None, formation_id=None):
    payload = {
        "titre": titre,
        "description": description,
        "max_errors": max_errors,
        "status": "published",
        "questions": [q_to_payload(q) for q in questions],
    }
    if chapitre_id:
        payload["chapitre_id"] = chapitre_id
    if formation_id:
        payload["formation_id"] = formation_id
    # JSON string, wrapped in dollar-quote to avoid SQL escape headaches
    payload_json = json.dumps(payload, ensure_ascii=False)
    return f"SELECT public.import_quiz_from_json($quiz${payload_json}$quiz$::jsonb);\n"

out = []
out.append("-- Quiz Personal Branding — 8 quiz de module + 1 quiz de validation finale.")
out.append("-- Généré par scripts/generate_pb_quizzes.py à partir du doc client Lovable.")
out.append("-- Même modèle que Muslim Mindset : quiz attachés aux chapitres, shuffle auto via import_quiz_from_json.")
out.append("")

# 8 module quizzes
for mod in range(1, 9):
    qs = by_module.get(mod, [])
    if len(qs) != 20:
        print(f"[WARN] Module {mod} has {len(qs)} questions (expected 20)", file=sys.stderr)
    titre = f"Quiz Personal Branding — {MODULE_TITLES[mod]}"
    desc = f"{len(qs)} questions. Valide ce quiz pour débloquer la suite de la formation."
    # max_errors = 3 (comme les autres quiz de module — Closing, Setting…)
    out.append(emit_import(titre, desc, qs, max_errors=3, chapitre_id=CHAPTER_IDS[mod]))

# Final quiz : 23 questions de modules + 7 transversales
# Construction selon la logique Lovable :
# module1[3,5,19], module2[5,7,19], module3[0,9,19], module4[0,5,4],
# module5[0,1,4], module6[0,2,12], module7[0,7],
# module8[2,5,19], transversalQuestions[0,1,3,4,6,8,9]
picks = [
    (1, [3, 5, 19]),
    (2, [5, 7, 19]),
    (3, [0, 9, 19]),
    (4, [0, 5, 4]),
    (5, [0, 1, 4]),
    (6, [0, 2, 12]),
    (7, [0, 7]),
    (8, [2, 5, 19]),
]
final_qs = []
for mod, idxs in picks:
    for i in idxs:
        final_qs.append(by_module[mod][i])
# Transversales
trans_idxs = [0, 1, 3, 4, 6, 8, 9]
for i in trans_idxs:
    final_qs.append(by_module[0][i])

assert len(final_qs) == 30, f"Final quiz has {len(final_qs)} questions (expected 30)"

out.append(emit_import(
    titre="Quiz Personal Branding — Validation Finale",
    description=f"{len(final_qs)} questions (23 des modules + 7 transversales). Valide ce quiz pour finaliser la formation et débloquer le chapitre suivant de ton parcours.",
    questions=final_qs,
    max_errors=3,
    formation_id=FORMATION_ID,
))

print("".join(out))
