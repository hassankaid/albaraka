// Affiche un texte du cahier en mettant en or les mots entre {accolades}.
// Les accolades sont la convention du cahier (chapitre 4) ; elles ne doivent
// jamais apparaître à l'écran.

export function morceaux(texte: string): { texte: string; or: boolean }[] {
  return texte
    .split(/(\{[^}]*\})/)
    .filter(Boolean)
    .map((m) => (m.startsWith("{") && m.endsWith("}") ? { texte: m.slice(1, -1), or: true } : { texte: m, or: false }));
}

export default function Or({ texte }: { texte: string }) {
  return (
    <>
      {morceaux(texte).map((m, i) =>
        m.or ? (
          <span key={i} className="v-or">
            {m.texte}
          </span>
        ) : (
          m.texte
        ),
      )}
    </>
  );
}
