#!/usr/bin/env python3
"""
Génère la migration SQL Marketing Digital depuis le doc unique "QUIZ MARKETING.docx".
Format :
    - En-têtes globaux
    - MODULE 1 / titre / "30 questions..." / Q1-Q30 (avec 4 options A/B/C/D, sans marquage inline de la bonne réponse)
    - CORRIGÉ — MODULE 1 / titre / "Réponses correctes" / tableau Question/Réponse 3 colonnes × 10 lignes
    - MODULE 2 / ... etc (jusqu'à MODULE 10)
    - QUIZ FINAL / "Synthèse des 10 modules" / Q1-Q300
    - CORRIGÉ — QUIZ FINAL / tableau Question/Réponse (100 lignes × 3 col)

Usage :
    MARKETING_DOCX=path/to/QUIZ\ MARKETING.docx python scripts/generate_marketing_quizzes_v3.py > supabase/migrations/NNNN_quiz_marketing.sql
"""

import re
import json
import sys
import io
import os
import xml.etree.ElementTree as ET
import zipfile

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

DOCX = os.environ.get("MARKETING_DOCX", "/tmp/QUIZ_MARKETING.docx")

MODULES = [
    {"n": 1, "title": "Fondements & Écosystème",
     "chapitre_id": "0e3b906b-44f6-4e13-baf3-6a3b00d36055"},
    {"n": 2, "title": "Psychologie du consommateur digital",
     "chapitre_id": "48e86352-3b72-475d-a4f3-782dbd199e9d"},
    {"n": 3, "title": "Stratégie de contenu, persona & repurposing",
     "chapitre_id": "e7b884c0-3fbe-4987-b1c3-b282420906eb"},
    {"n": 4, "title": "Réseaux sociaux & profil Instagram optimisé",
     "chapitre_id": "8e7a8833-6379-489c-ba97-fbc77c8b030e"},
    {"n": 5, "title": "Réels : Stratégie & Création",
     "chapitre_id": "c6494fdb-8d3f-44c0-a652-5f0b62ff11aa"},
    {"n": 6, "title": "Réels : Algorithme & Viralité",
     "chapitre_id": "48f776ca-834b-4d46-a259-9bbd487705d1"},
    {"n": 7, "title": "Stories & Routines de croissance",
     "chapitre_id": "6161f616-4678-4bb1-bd3a-200374211d8e"},
    {"n": 8, "title": "Boost Instagram : Amplifier vos Réels",
     "chapitre_id": "70f05d3f-9bcf-4587-b4c9-dbf80bca3e9b"},
    {"n": 9, "title": "Le Parcours Client",
     "chapitre_id": "e54a59e9-18f0-45eb-b65e-5d5a601b320f"},
    {"n": 10, "title": "Analytics, IA & Stratégie long terme",
     "chapitre_id": "6f94fbf8-9ac2-4d0e-b7ab-a73823cd819b"},
]
FORMATION_ID = "4949ffda-77d2-450e-adad-83554645af32"

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

# ─── Lecture du doc ────────────────────────────────────────────────
with zipfile.ZipFile(DOCX, "r") as z:
    with z.open("word/document.xml") as f:
        root = ET.fromstring(f.read())

lines = []
for p in root.iter(f"{{{NS['w']}}}p"):
    line = "".join(t.text or "" for t in p.iter(f"{{{NS['w']}}}t"))
    if line.strip():
        lines.append(line.strip())


def find_index(pattern_re, from_idx=0):
    """Retourne l'index de la 1ère ligne matching le regex, ou -1."""
    for i in range(from_idx, len(lines)):
        if re.match(pattern_re, lines[i]):
            return i
    return -1


def parse_questions_block(block_lines):
    """
    Parse le bloc d'une section : lignes numérotées "1. Q ?", suivies des options
    "A) ..." "B) ..." "C) ..." "D) ...". Retourne [{question, options}].
    """
    questions = []
    current_q = None
    current_opts = []
    # Helper pour commit
    def commit():
        if current_q is not None:
            questions.append({"question": current_q, "options": list(current_opts), "correct_index": None, "explication": ""})

    q_re = re.compile(r"^(\d+)\.\s*(.+)")
    opt_re = re.compile(r"^([A-Z])\)\s*(.+)")
    for l in block_lines:
        m = q_re.match(l)
        if m:
            # Nouvelle question
            commit()
            current_q = m.group(2).strip()
            current_opts = []
            continue
        m = opt_re.match(l)
        if m and current_q is not None:
            current_opts.append(m.group(2).strip())
            continue
        # Ligne de continuation d'une question (rare) : append to current_q
        if current_q is not None and not current_opts:
            current_q += " " + l.strip()
    commit()
    return questions


def parse_answers_block(block_lines):
    """
    Dans le tableau Corrigé : lignes alternent nombres (Q #) et lettres A/B/C/D.
    On matche l'ordre d'apparition : chaque nombre suivi d'une lettre.
    Ignore "Question", "Réponse", "Réponses correctes", lignes vides, etc.
    Retourne dict {num: letter}.
    """
    answers = {}
    i = 0
    while i < len(block_lines):
        l = block_lines[i].strip()
        # Ligne contenant juste un nombre
        if re.fullmatch(r"\d+", l):
            num = int(l)
            # Chercher la prochaine ligne qui est juste une lettre
            j = i + 1
            while j < len(block_lines):
                cand = block_lines[j].strip()
                if re.fullmatch(r"[A-D]", cand):
                    answers[num] = cand
                    i = j
                    break
                # On saute les autres contenus (peut arriver "Question", "Réponse" au milieu)
                if re.fullmatch(r"\d+", cand):
                    # Next question number without answer — skip (corrupt), don't set
                    break
                j += 1
            else:
                break
        i += 1
    return answers


def build_quiz(section_start, section_end, corrige_start, corrige_end):
    """
    section_start → section_end : bloc des questions
    corrige_start → corrige_end : bloc du corrigé
    Retourne la liste des questions avec correct_index assigné.
    """
    q_block = lines[section_start + 1:corrige_start]  # skip le titre "MODULE N"
    a_block = lines[corrige_start:corrige_end]

    questions = parse_questions_block(q_block)
    answers = parse_answers_block(a_block)

    for idx, q in enumerate(questions):
        num = idx + 1
        letter = answers.get(num)
        if letter is None:
            print(f"[WARN] Pas de réponse pour Q{num} — options: {q['options'][:1]}...", file=sys.stderr)
            q["correct_index"] = 0  # fallback
            continue
        q["correct_index"] = ord(letter) - ord("A")
    return questions


def emit_import(titre, description, questions, max_errors, chapitre_id=None, formation_id=None):
    payload = {
        "titre": titre, "description": description, "max_errors": max_errors,
        "status": "published", "questions": questions,
    }
    if chapitre_id:
        payload["chapitre_id"] = chapitre_id
    if formation_id:
        payload["formation_id"] = formation_id
    return f"SELECT public.import_quiz_from_json($quiz${json.dumps(payload, ensure_ascii=False)}$quiz$::jsonb);\n"


# ─── Pipeline ──────────────────────────────────────────────────────
out = [
    "-- Quiz Marketing Digital — 10 quiz de module + 1 quiz de validation finale.",
    "-- Généré par scripts/generate_marketing_quizzes_v3.py depuis le doc unique QUIZ MARKETING.docx.",
    "",
]

# Localise tous les markers dans le doc
markers = []
for i, l in enumerate(lines):
    if re.fullmatch(r"MODULE \d+", l):
        markers.append(("MODULE", i, int(re.search(r"\d+", l).group())))
    elif re.match(r"^CORRIGÉ — MODULE \d+", l):
        markers.append(("CORRIGE_MOD", i, int(re.search(r"\d+", l).group())))
    elif l == "QUIZ FINAL":
        markers.append(("FINAL", i, 0))
    elif l.startswith("CORRIGÉ — QUIZ FINAL"):
        markers.append(("CORRIGE_FINAL", i, 0))

# Debug
for kind, idx, n in markers:
    print(f"[DEBUG] {kind} {n} at line {idx}", file=sys.stderr)

# Build quizzes for each module
for mod in MODULES:
    n = mod["n"]
    mod_start = None
    cor_start = None
    cor_end = None
    for kind, idx, num in markers:
        if kind == "MODULE" and num == n:
            mod_start = idx
        elif kind == "CORRIGE_MOD" and num == n:
            cor_start = idx
    # corrigé se termine au prochain marker (MODULE suivant OU QUIZ FINAL)
    if cor_start is not None:
        for kind, idx, num in markers:
            if idx > cor_start:
                cor_end = idx
                break
    if cor_end is None:
        cor_end = len(lines)
    if mod_start is None or cor_start is None:
        print(f"[ERROR] Module {n} introuvable (start={mod_start}, corrige={cor_start})", file=sys.stderr)
        continue
    questions = build_quiz(mod_start, cor_start, cor_start, cor_end)
    print(f"[INFO] Module {n} : {len(questions)} questions", file=sys.stderr)
    titre = f"Quiz Marketing Digital — Module {n} — {mod['title']}"
    desc = f"{len(questions)} questions. Valide ce quiz pour débloquer la suite de la formation."
    out.append(emit_import(titre, desc, questions, max_errors=3, chapitre_id=mod["chapitre_id"]))

# Final quiz
final_start = None
cor_final = None
for kind, idx, num in markers:
    if kind == "FINAL":
        final_start = idx
    elif kind == "CORRIGE_FINAL":
        cor_final = idx
if final_start is not None and cor_final is not None:
    questions = build_quiz(final_start, cor_final, cor_final, len(lines))
    print(f"[INFO] Final : {len(questions)} questions", file=sys.stderr)
    out.append(emit_import(
        titre="Quiz Marketing Digital — Validation Finale",
        description=f"{len(questions)} questions de synthèse. Valide ce quiz pour finaliser la formation.",
        questions=questions,
        max_errors=3,
        formation_id=FORMATION_ID,
    ))
else:
    print("[ERROR] Quiz final introuvable", file=sys.stderr)

print("".join(out))
