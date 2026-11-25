// deno test supabase/functions/connecteur-equipe/connecteur_test.ts
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { emballer, enTableau, nettoyerRequete, premierMot, verifierRequete } from "./outils.ts";
import { adresseRetourValide, base64url, pkceValide } from "./oauth.ts";

Deno.test("nettoyerRequete retire commentaires de tête et point-virgule final", () => {
  assertEquals(nettoyerRequete("-- note\n/* bloc */  select 1 ;  "), "select 1");
  assertEquals(nettoyerRequete("select 1; select 2;"), "select 1; select 2");
});

Deno.test("seules les lectures passent", () => {
  for (const q of ["select 1", "with x as (select 1) select * from x", "(select 1)", "values (1)", "table leads", "explain select 1", "show timezone"]) {
    assertEquals(verifierRequete(q), null, q);
  }
  for (const q of ["update leads set notes = ''", "delete from sales", "insert into x values (1)", "set transaction read write",
    "commit", "begin", "grant select on x to y", "drop table x", "truncate x", "copy x to stdout", "do $$ begin end $$", "call p()"]) {
    assert(verifierRequete(q) !== null, q);
  }
  assertEquals(premierMot("  ((SELECT 1))"), "select");
});

Deno.test("emballer limite le nombre de lignes, sauf EXPLAIN/SHOW", () => {
  assertEquals(emballer("select 1", 10), "select * from (\nselect 1\n) as _resultat limit 11");
  assertEquals(emballer("explain select 1", 10), "explain select 1");
});

Deno.test("enTableau échappe les | et coupe les cellules longues", () => {
  const { texte, coupees } = enTableau(["a", "b"], [{ a: "x|y", b: null }, { a: "z".repeat(700), b: 2 }]);
  assert(texte.includes("x\\|y | NULL"));
  assert(texte.includes("…[coupé]"));
  assertEquals(coupees, 0);
});

Deno.test("PKCE S256 (exemple de la RFC 7636)", async () => {
  assert(await pkceValide("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"));
  assert(!(await pkceValide("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk", "autre")));
  assertEquals(base64url(new Uint8Array([251, 255])), "-_8");
});

Deno.test("adresses de retour : https ou localhost seulement", () => {
  assert(adresseRetourValide("https://claude.ai/api/mcp/auth_callback"));
  assert(adresseRetourValide("http://localhost:33418/callback"));
  assert(adresseRetourValide("http://127.0.0.1:5000/cb"));
  assert(!adresseRetourValide("http://exemple.com/cb"));
  assert(!adresseRetourValide("javascript:alert(1)"));
  assert(!adresseRetourValide("https://claude.ai/cb#x"));
});
