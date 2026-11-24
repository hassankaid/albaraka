// deno test supabase/functions/tunnel-lead-submit/snap_test.ts
import { assertEquals, assert } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { decisionSnap, evenementSignUp, idEvenement, normaliser } from "./snap.ts";

const base = { source: "webi_wa_snap_ads", origine: "https://event.albarakaecosysteme.com", telephoneE164: "+33612345678", eventId: "0b6c1d2e-aaaa-bbbb-cccc-123456789abc" };

Deno.test("envoie une inscription du tunnel conférence, domaine historique, zone cible", () => {
  assertEquals(decisionSnap(base), { envoyer: true });
  assertEquals(decisionSnap({ ...base, source: "webi_vsl_ads", telephoneE164: "+32470123456" }), { envoyer: true });
});

Deno.test("n'envoie pas ce que le pixel n'envoie pas", () => {
  assertEquals(decisionSnap({ ...base, telephoneE164: "+25377123456" }), { envoyer: false, raison: "hors zone" });
  assertEquals(decisionSnap({ ...base, telephoneE164: "+262692123456" }), { envoyer: false, raison: "hors zone" });
  assertEquals(decisionSnap({ ...base, origine: "https://event.albarakabyethicarena.com" }), { envoyer: false, raison: "domaine sans pixel Snap" });
  assertEquals(decisionSnap({ ...base, origine: null }), { envoyer: false, raison: "domaine sans pixel Snap" });
  assertEquals(decisionSnap({ ...base, source: "liberty_snap_ads" }), { envoyer: false, raison: "hors tunnel conférence" });
  assertEquals(decisionSnap({ ...base, source: "site_vitrine" }), { envoyer: false, raison: "hors tunnel conférence" });
  assertEquals(decisionSnap({ ...base, eventId: null }), { envoyer: false, raison: "sans identifiant d'évènement" });
});

Deno.test("identifiant d'évènement : UUID accepté, le reste refusé", () => {
  assertEquals(idEvenement(base.eventId), base.eventId);
  assertEquals(idEvenement("x"), null);
  assertEquals(idEvenement("<script>alert(1)</script>"), null);
  assertEquals(idEvenement(42), null);
});

Deno.test("normalisations de Snap", () => {
  assertEquals(normaliser.email("  Person@Example.com "), "person@example.com");
  assertEquals(normaliser.telephone("+44 844 412 4653"), "448444124653");
  assertEquals(normaliser.telephone("+33612345678"), "33612345678");
  assertEquals(normaliser.prenom("Jean-Éric"), "jeanéric");
});

Deno.test("évènement SIGN_UP : identifiant partagé, données chiffrées, clic Snap en clair", async () => {
  const c = await evenementSignUp({
    eventId: base.eventId, email: "Test@Example.com", telephoneE164: "+33612345678", prenom: "Sara",
    urlPage: "https://event.albarakaecosysteme.com/webinaire", ip: "1.2.3.4", userAgent: "UA", sccid: "abc", scid: "def", maintenant: 1700000000000,
  });
  const e = c.data[0];
  assertEquals(e.event_name, "SIGN_UP");
  assertEquals(e.action_source, "WEB");
  assertEquals(e.event_id, base.eventId);
  assertEquals(e.event_time, 1700000000000);
  const u = e.user_data as Record<string, unknown>;
  // sha256("test@example.com")
  assertEquals((u.em as string[])[0], "973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b");
  assert(/^[0-9a-f]{64}$/.test((u.ph as string[])[0]));
  assertEquals(u.sc_click_id, "abc");
  assertEquals(u.sc_cookie1, "def");
  assertEquals(u.client_ip_address, "1.2.3.4");
});
