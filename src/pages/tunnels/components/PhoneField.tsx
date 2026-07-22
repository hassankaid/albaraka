// Champ téléphone international du module « tunnels ».
//
// S'appuie sur react-phone-number-input (déjà présent dans le projet) → on
// obtient : drapeau du pays, sélecteur de pays, formatage automatique « masque »
// (espacements corrects par pays via libphonenumber) et une valeur E.164 propre.
// La validité par pays se vérifie avec isValidPhoneNumber (bon nombre de chiffres).
//
// Recopié dans le module (styles dédiés noir/or) plutôt qu'importé du reste de
// l'app, pour garder les tunnels autonomes — seule la lib npm est partagée.
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import frLocale from "react-phone-number-input/locale/fr.json";
import "react-phone-number-input/style.css";
import { T } from "../theme";

export { isValidPhoneNumber };

interface Props {
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}

export default function PhoneField({ value, onChange }: Props) {
  return (
    <div className="albt-phone">
      <style>{`
        /* Champ clair — cohérent avec le pop-in blanc/ivoire */
        .albt-phone .PhoneInput {
          display:flex; align-items:center; gap:10px; width:100%;
          padding:13px 14px; background:#FFFFFF;
          border:1px solid #E4DBCB; border-radius:12px;
          transition:border-color .15s, box-shadow .15s;
        }
        .albt-phone .PhoneInput--focus { border-color:${T.gold}; box-shadow:0 0 0 3px rgba(201,160,78,0.18); }
        .albt-phone .PhoneInputCountry { margin:0; }
        .albt-phone .PhoneInputCountryIcon--border { box-shadow:none; background:transparent; }
        .albt-phone .PhoneInputCountrySelectArrow { color:rgba(26,18,6,0.5); opacity:.9; margin-left:6px; }
        .albt-phone input.PhoneInputInput {
          flex:1; min-width:0; background:transparent; border:none; outline:none;
          color:#1A1206; font-family:${T.body}; font-size:1rem; letter-spacing:.01em;
        }
        .albt-phone input.PhoneInputInput::placeholder { color:rgba(26,18,6,0.44); }
        .albt-phone select.PhoneInputCountrySelect option { color:#111; }
      `}</style>
      <PhoneInput
        international
        defaultCountry="FR"
        labels={frLocale}
        value={value}
        onChange={onChange}
        placeholder="Numéro de téléphone"
      />
    </div>
  );
}
