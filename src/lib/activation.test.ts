import { describe, expect, it, vi } from "vitest";
import {
  avecDelai,
  changerMotDePasse,
  DelaiDepasse,
  lienPerime,
  lireLien,
  messageActivation,
  navigateur,
  rafraichir,
  sujetDuJeton,
} from "./activation";

const serveur = (reponse: () => Promise<Response>) => ({ url: "https://x.supabase.co", cle: "anon", fetch: vi.fn(reponse) as unknown as typeof fetch });

describe("le lien d'activation", () => {
  it("lit les jetons du lien", () => {
    const { jetons, erreur } = lireLien("#access_token=aaa&refresh_token=rrr&type=recovery&expires_in=3600");
    expect(erreur).toBeNull();
    expect(jetons).toEqual({ access_token: "aaa", refresh_token: "rrr", type: "recovery" });
  });
  it("reconnaît un lien expiré ou déjà utilisé", () => {
    expect(lireLien("#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired").erreur).toBe(
      "Email link is invalid or has expired",
    );
    expect(lireLien("").jetons).toBeNull();
  });
  it("retrouve le compte dans le jeton", () => {
    const charge = btoa(JSON.stringify({ sub: "abc-123" })).replace(/=+$/, "");
    expect(sujetDuJeton(`x.${charge}.y`)).toBe("abc-123");
    expect(sujetDuJeton("pas un jeton")).toBeNull();
  });
});

describe("enregistrer le mot de passe", () => {
  it("envoie le mot de passe avec le jeton du lien", async () => {
    const s = serveur(async () => new Response("{}", { status: 200 }));
    expect(await changerMotDePasse(s, "jeton", "Motdepasse1!")).toMatchObject({ ok: true });
    const [url, options] = (s.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://x.supabase.co/auth/v1/user");
    expect(options.method).toBe("PUT");
    expect(options.headers.Authorization).toBe("Bearer jeton");
    expect(JSON.parse(options.body)).toEqual({ password: "Motdepasse1!" });
  });

  it("ne tourne jamais sans fin : au bout du délai, un message clair", async () => {
    const s = serveur(
      (...args: unknown[]) =>
        new Promise((_, ko) => (args[1] as RequestInit).signal!.addEventListener("abort", () => ko(new DOMException("stop", "AbortError")))),
    );
    const r = await changerMotDePasse({ ...s, fetch: ((u: string, o: RequestInit) => (s.fetch as unknown as (u: string, o: RequestInit) => Promise<Response>)(u, o)) as unknown as typeof fetch }, "j", "m", 20);
    expect(r).toMatchObject({ ok: false, statut: 0, code: "delai" });
    expect(messageActivation(r)).toMatch(/trop de temps/);
  });

  it("reconnaît un lien périmé et une erreur de mot de passe", async () => {
    const perime = await changerMotDePasse(serveur(async () => new Response(JSON.stringify({ code: 403, error_code: "bad_jwt", msg: "invalid JWT" }), { status: 403 })), "j", "m");
    expect(lienPerime(perime)).toBe(true);
    expect(messageActivation(perime)).toMatch(/expiré/);
    const meme = await changerMotDePasse(serveur(async () => new Response(JSON.stringify({ error_code: "same_password", msg: "New password should be different" }), { status: 422 })), "j", "m");
    expect(lienPerime(meme)).toBe(false);
    expect(messageActivation(meme)).toMatch(/différent/);
  });

  it("obtient un jeton neuf avec le jeton de rafraîchissement", async () => {
    const ok = serveur(async () => new Response(JSON.stringify({ access_token: "neuf", refresh_token: "r2" }), { status: 200 }));
    expect(await rafraichir(ok, "r1")).toEqual({ access_token: "neuf", refresh_token: "r2" });
    expect(await rafraichir(serveur(async () => new Response("{}", { status: 400 })), "r1")).toBeNull();
  });
});

describe("outils", () => {
  it("avecDelai rejette au bout du délai", async () => {
    await expect(avecDelai(new Promise(() => undefined), 10)).rejects.toBeInstanceOf(DelaiDepasse);
    await expect(avecDelai(Promise.resolve(3), 10)).resolves.toBe(3);
  });
  it("nomme le navigateur", () => {
    expect(navigateur("Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.3 Mobile/15E148 Safari/604.1")).toBe("iPhone · Safari");
    expect(navigateur("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36")).toBe("Windows · Chrome");
  });
});
