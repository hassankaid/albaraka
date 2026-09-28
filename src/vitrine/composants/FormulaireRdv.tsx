// ─────────────────────────────────────────────────────────────────────────
// Formulaire de prise de rendez-vous (cahier §6).
//
// Validation en direct : un champ n'est jugé qu'après avoir été quitté une
// première fois (ou à l'envoi) — personne n'aime lire « email invalide »
// pendant qu'il tape encore. Ensuite, le message se met à jour à chaque frappe.
//
// Anti-spam sans captcha : un champ piège, invisible et hors du parcours
// clavier. Un humain ne le remplit jamais ; un robot remplit tout. Rempli, on
// fait comme si l'envoi avait réussi — un robot à qui on dit « refusé »
// réessaie autrement, un robot à qui on dit « merci » s'en va.
//
// Pendant l'envoi, le bouton est désactivé : un double clic ne crée pas deux
// demandes (la fonction serveur fusionne de toute façon les doublons du jour).
// ─────────────────────────────────────────────────────────────────────────
import { useState, type FormEvent } from "react";
import { useHref, useNavigate } from "react-router-dom";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import frLocale from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";
import { FORMULAIRE } from "../contenu";
import { envoyerDemande } from "../api";

type Champ = "prenom" | "nom" | "email" | "telephone" | "situation" | "consentement";

interface Valeurs {
  prenom: string;
  nom: string;
  email: string;
  telephone: string | undefined;
  situation: string;
  consentement: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Le message d'erreur d'un champ, ou `null` s'il est valide. */
export function erreurDe(champ: Champ, v: Valeurs): string | null {
  const E = FORMULAIRE.erreurs;
  switch (champ) {
    case "prenom":
      return v.prenom.trim().length >= 2 ? null : E.prenom;
    case "nom":
      return v.nom.trim().length >= 2 ? null : E.nom;
    case "email":
      return EMAIL.test(v.email.trim()) ? null : E.email;
    case "telephone":
      return v.telephone && isValidPhoneNumber(v.telephone) ? null : E.telephone;
    case "situation":
      return (FORMULAIRE.situations as readonly string[]).includes(v.situation) ? null : E.situation;
    case "consentement":
      return v.consentement ? null : E.consentement;
  }
}

const ORDRE: Champ[] = ["prenom", "nom", "email", "telephone", "situation", "consentement"];

export default function FormulaireRdv() {
  const navigate = useNavigate();
  const lienConfidentialite = useHref("/politique-de-confidentialite");
  const [v, setV] = useState<Valeurs>({
    prenom: "",
    nom: "",
    email: "",
    telephone: undefined,
    situation: "",
    consentement: false,
  });
  const [touches, setTouches] = useState<Partial<Record<Champ, boolean>>>({});
  const [piege, setPiege] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);

  const maj = <K extends keyof Valeurs>(k: K, val: Valeurs[K]) => setV((p) => ({ ...p, [k]: val }));
  const toucher = (c: Champ) => setTouches((t) => ({ ...t, [c]: true }));
  const erreur = (c: Champ) => (touches[c] ? erreurDe(c, v) : null);

  const soumettre = async (e: FormEvent) => {
    e.preventDefault();
    if (envoi) return;
    setErreurEnvoi(null);

    const invalides = ORDRE.filter((c) => erreurDe(c, v));
    if (invalides.length) {
      setTouches(Object.fromEntries(ORDRE.map((c) => [c, true])));
      document.getElementById(`rdv-${invalides[0]}`)?.focus();
      return;
    }
    if (piege) {
      navigate("/merci");
      return;
    }

    setEnvoi(true);
    try {
      await envoyerDemande({
        prenom: v.prenom,
        nom: v.nom,
        email: v.email,
        telephone: v.telephone!,
        situation: v.situation,
      });
      navigate("/merci");
    } catch (err) {
      console.error("[site vitrine] envoi de la demande", err);
      setErreurEnvoi(FORMULAIRE.erreurs.envoi);
      setEnvoi(false);
    }
  };

  const C = FORMULAIRE.champs;
  const aide = (c: Champ) => (erreur(c) ? `rdv-${c}-erreur` : undefined);
  const MessageErreur = ({ c }: { c: Champ }) =>
    erreur(c) ? (
      <p className="v-erreur" id={`rdv-${c}-erreur`}>
        {erreur(c)}
      </p>
    ) : null;

  return (
    <form className="v-formulaire" onSubmit={soumettre} noValidate aria-label="Demande de rendez-vous">
      <div className="v-deux-champs">
        <div className="v-champ">
          <label htmlFor="rdv-prenom">{C.prenom}</label>
          <input
            id="rdv-prenom"
            className="v-saisie"
            type="text"
            name="prenom"
            autoComplete="given-name"
            required
            value={v.prenom}
            onChange={(e) => maj("prenom", e.target.value)}
            onBlur={() => toucher("prenom")}
            aria-invalid={!!erreur("prenom")}
            aria-describedby={aide("prenom")}
          />
          <MessageErreur c="prenom" />
        </div>
        <div className="v-champ">
          <label htmlFor="rdv-nom">{C.nom}</label>
          <input
            id="rdv-nom"
            className="v-saisie"
            type="text"
            name="nom"
            autoComplete="family-name"
            required
            value={v.nom}
            onChange={(e) => maj("nom", e.target.value)}
            onBlur={() => toucher("nom")}
            aria-invalid={!!erreur("nom")}
            aria-describedby={aide("nom")}
          />
          <MessageErreur c="nom" />
        </div>
      </div>

      <div className="v-champ">
        <label htmlFor="rdv-email">{C.email}</label>
        <input
          id="rdv-email"
          className="v-saisie"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          value={v.email}
          onChange={(e) => maj("email", e.target.value)}
          onBlur={() => toucher("email")}
          aria-invalid={!!erreur("email")}
          aria-describedby={aide("email")}
        />
        <MessageErreur c="email" />
      </div>

      <div className="v-champ">
        <label htmlFor="rdv-telephone">{C.telephone}</label>
        <div className={`v-telephone${erreur("telephone") ? " v-telephone--erreur" : ""}`}>
          {/* Indicatif pays, France par défaut ; la valeur est toujours au
              format international (+33…), c'est elle qui part au CRM. */}
          <PhoneInput
            id="rdv-telephone"
            name="telephone"
            defaultCountry="FR"
            labels={frLocale}
            autoComplete="tel"
            value={v.telephone}
            onChange={(val) => maj("telephone", val)}
            onBlur={() => toucher("telephone")}
            aria-invalid={!!erreur("telephone")}
            aria-describedby={aide("telephone")}
          />
        </div>
        <MessageErreur c="telephone" />
      </div>

      <div className="v-champ">
        <label htmlFor="rdv-situation">{C.situation}</label>
        <select
          id="rdv-situation"
          className="v-saisie"
          name="situation"
          required
          value={v.situation}
          onChange={(e) => {
            maj("situation", e.target.value);
            toucher("situation");
          }}
          onBlur={() => toucher("situation")}
          aria-invalid={!!erreur("situation")}
          aria-describedby={aide("situation")}
        >
          <option value="" disabled>
            Sélectionner
          </option>
          {FORMULAIRE.situations.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <MessageErreur c="situation" />
      </div>

      {/* Champ piège : hors écran, hors parcours clavier, ignoré des lecteurs
          d'écran et du remplissage automatique. */}
      <div className="v-piege" aria-hidden="true">
        <label htmlFor="rdv-site">Site web</label>
        <input
          id="rdv-site"
          type="text"
          name="site_web"
          tabIndex={-1}
          autoComplete="off"
          value={piege}
          onChange={(e) => setPiege(e.target.value)}
        />
      </div>

      <div>
        <label className="v-consentement" htmlFor="rdv-consentement">
          <input
            id="rdv-consentement"
            type="checkbox"
            name="consentement"
            required
            checked={v.consentement}
            onChange={(e) => {
              maj("consentement", e.target.checked);
              toucher("consentement");
            }}
            aria-invalid={!!erreur("consentement")}
            aria-describedby={aide("consentement")}
          />
          <span>
            {FORMULAIRE.consentement.avant}
            <span className="v-consentement-petit">{FORMULAIRE.consentement.parenthese}</span>
            {FORMULAIRE.consentement.milieu}
            <a href={lienConfidentialite} target="_blank" rel="noopener noreferrer">
              {FORMULAIRE.consentement.lien}
            </a>
            {FORMULAIRE.consentement.apres}
          </span>
        </label>
        <MessageErreur c="consentement" />
      </div>

      {erreurEnvoi && (
        <p className="v-erreur-envoi" role="alert">
          {erreurEnvoi}
        </p>
      )}

      <button type="submit" className="v-bouton v-bouton-or v-bouton-envoi" disabled={envoi} aria-busy={envoi}>
        {envoi && <span className="v-roue" aria-hidden="true" />}
        {FORMULAIRE.bouton}
      </button>
    </form>
  );
}
