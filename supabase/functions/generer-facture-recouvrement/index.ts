// generer-facture-recouvrement — facture REC d'une échéance impayée (09/10/2026).
//
// Pour le cabinet d'avocats chargé du recouvrement. À la demande du CEO :
//   - { payment_id }            → crée la facture REC de cette échéance (numéro
//                                 suivant, daté du jour de l'échéance) ou renvoie
//                                 celle qui existe, puis produit son PDF ;
//   - { facture_id, regenerer } → reproduit le PDF d'une facture existante
//                                 (même numéro, même date) — sert aux factures
//                                 reprises du fichier du cabinet, dont on n'a
//                                 pas les PDF.
//
// Différences avec generate-client-invoice (factures FAC, échéances payées) :
//   - datée du jour de l'ÉCHÉANCE, pas du jour où elle est produite ;
//   - indique le reste à payer, pas « total payé » ;
//   - JAMAIS envoyée au client : aucun e-mail ici.
// Le numéro est attribué par la fonction SQL `creer_facture_recouvrement`,
// sous verrou (aucun doublon, aucun saut).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Même émetteur que les factures FAC.
const ISSUER = {
  name: "ETHICARENA LLC",
  rep: "Sidali GHALMI",
  line1: "Meydan Grandstand, 6th floor",
  line2: "Meydan Road, Nad Al Sheba",
  city: "Dubai",
  country: "United Arab Emirates",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function fmtEur(n: number): string {
  const raw = n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return raw.replace(/[    ⁠]/g, " ") + " €";
}

/** « 2026-05-06 » → « 06/05/2026 », sans passer par un fuseau horaire. */
function fmtDate(iso: string): string {
  const [a, m, j] = iso.slice(0, 10).split("-");
  return `${j}/${m}/${a}`;
}

function majOuNull(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = String(s).trim();
  return t ? t.toUpperCase() : null;
}

function sanitize(s: string): string {
  return String(s)
    .replace(/[    ⁠]/g, " ")
    .replace(/[ﷻ]/g, "")
    .replace(/[…]/g, "...")
    .replace(/[—–]/g, "-")
    .replace(/[«»]/g, '"')
    .replace(/['']/g, "'");
}

/** Même libellé que les factures FAC (voir generate-client-invoice). */
function libelleFacture(produit: string | null | undefined): string {
  const p = String(produit || "PASS AL BARAKA").trim();
  const cle = p.toUpperCase();
  if (cle === "PASS AL BARAKA") return "Accès à la plateforme : Pass Al Baraka";
  if (cle === "PASS LIBERTY" || cle === "LIBERTY") return "Accès à la plateforme : Pass Liberty";
  return p;
}

interface Client {
  nom: string;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  code_postal: string | null;
  ville: string | null;
  pays: string | null;
}

interface DonneesPdf {
  numero: string;
  dateFacture: string;
  montant: number;
  paymentNumber: number | null;
  totalPayments: number | null;
  produit: string;
  client: Client;
}

async function genererPdf(d: DonneesPdf): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const helvBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const courier = await doc.embedFont(StandardFonts.Courier);

  const gold = rgb(0xC5 / 255, 0xA5 / 255, 0x5A / 255);
  const goldLight = rgb(0xFD / 255, 0xF8 / 255, 0xED / 255);
  const goldDark = rgb(0x8A / 255, 0x6D / 255, 0x2C / 255);
  const dark = rgb(0x1A / 255, 0x1A / 255, 0x2E / 255);
  const gray = rgb(0.4, 0.4, 0.4);
  const grayBorder = rgb(0xF0 / 255, 0xE6 / 255, 0xD0 / 255);
  const lightGray = rgb(0.6, 0.6, 0.6);

  const txt = (p: PDFPage, t: string, x: number, y: number, o: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb> } = {}) =>
    p.drawText(sanitize(t), { x, y, size: o.size ?? 10, font: o.font ?? helv, color: o.color ?? dark });
  const aDroite = (t: string, droite: number, y: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>) =>
    txt(page, t, droite - font.widthOfTextAtSize(sanitize(t), size), y, { size, font, color });

  const margin = 50;
  const rightEdge = width - margin;
  let y = height - margin;

  txt(page, "AL BARAKA", margin, y - 10, { size: 22, font: helvBold });
  txt(page, "Ecosysteme by Ethicarena", margin, y - 28, { size: 8, color: gold });
  aDroite("FACTURE", rightEdge, y - 10, 20, helvBold, gold);
  aDroite(d.numero, rightEdge, y - 32, 11, courier, gray);
  aDroite(`Date de facture : ${fmtDate(d.dateFacture)}`, rightEdge, y - 50, 9, helv, gray);
  aDroite(`Date d'echeance : ${fmtDate(d.dateFacture)}`, rightEdge, y - 64, 9, helv, gray);

  page.drawRectangle({ x: margin, y: y - 80, width: width - 2 * margin, height: 2, color: gold });
  y -= 110;

  const colWidth = (width - 2 * margin - 30) / 2;
  const gauche = margin;
  const droite = margin + colWidth + 30;
  txt(page, "EMETTEUR", gauche, y, { size: 8, font: helvBold, color: gold });
  txt(page, "DESTINATAIRE", droite, y, { size: 8, font: helvBold, color: gold });
  y -= 16;
  txt(page, ISSUER.name, gauche, y, { size: 11, font: helvBold });
  txt(page, d.client.nom, droite, y, { size: 11, font: helvBold });
  y -= 14;
  txt(page, ISSUER.rep, gauche, y, { size: 9, color: gray });
  if (d.client.adresse) txt(page, d.client.adresse, droite, y, { size: 9, color: gray });
  y -= 12;
  txt(page, ISSUER.line1, gauche, y, { size: 9, color: gray });
  if (d.client.code_postal || d.client.ville) {
    txt(page, `${d.client.code_postal || ""} ${d.client.ville || ""}`.trim(), droite, y, { size: 9, color: gray });
  }
  y -= 12;
  txt(page, ISSUER.line2, gauche, y, { size: 9, color: gray });
  if (d.client.pays) txt(page, d.client.pays, droite, y, { size: 9, color: gray });
  y -= 12;
  txt(page, `${ISSUER.city}, ${ISSUER.country}`, gauche, y, { size: 9, color: gray });
  if (d.client.email) txt(page, d.client.email, droite, y, { size: 9, color: gray });
  y -= 12;
  if (d.client.telephone) txt(page, d.client.telephone, droite, y, { size: 9, color: gray });
  y -= 28;

  const colDesc = margin + 12;
  const colMontant = width - margin - 12;
  page.drawRectangle({ x: margin, y: y - 4, width: width - 2 * margin, height: 26, color: goldLight });
  txt(page, "DESCRIPTION", colDesc, y + 6, { size: 8, font: helvBold, color: goldDark });
  aDroite("MONTANT", colMontant, y + 6, 8, helvBold, goldDark);
  y -= 26;

  const echeance = d.paymentNumber && d.totalPayments ? `Echeance ${d.paymentNumber}/${d.totalPayments}` : "Echeance";
  txt(page, d.produit, colDesc, y - 5, { size: 11, font: helvBold });
  txt(page, `${echeance} - exigible le ${fmtDate(d.dateFacture)}`, colDesc, y - 20, { size: 9, color: lightGray });
  aDroite(fmtEur(d.montant), colMontant, y - 5, 11, helv, dark);
  y -= 40;
  page.drawRectangle({ x: margin, y, width: width - 2 * margin, height: 1, color: grayBorder });
  y -= 18;

  const ligne = (libelle: string, valeur: number) => {
    txt(page, libelle, colDesc, y, { size: 10, color: gray });
    aDroite(fmtEur(valeur), colMontant, y, 10, helv, dark);
    y -= 16;
  };
  ligne("Sous-total HT", d.montant);
  ligne("TVA (0%)", 0);
  ligne("Total TTC", d.montant);
  ligne("Deja regle", 0);
  y += 2;

  page.drawRectangle({ x: margin, y: y - 22, width: width - 2 * margin, height: 30, color: goldLight });
  txt(page, "RESTE A PAYER", colDesc, y - 14, { size: 12, font: helvBold });
  aDroite(fmtEur(d.montant), colMontant, y - 14, 13, helvBold, gold);

  const footerY = 72;
  page.drawRectangle({ x: margin, y: footerY + 30, width: width - 2 * margin, height: 1, color: grayBorder });
  const centre = (t: string, yy: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>) =>
    txt(page, t, (width - font.widthOfTextAtSize(sanitize(t), size)) / 2, yy, { size, font, color });
  centre("AL BARAKA - ECOSYSTEME BY ETHICARENA", footerY + 14, 9, helvBold, gold);
  centre(`Facture emise par ${ISSUER.name} (${ISSUER.city}, ${ISSUER.country})`, footerY, 8, helv, gray);
  centre("TVA 0% - Societe etablie aux Emirats arabes unis", footerY - 12, 8, helv, gray);

  return await doc.save();
}

/** Coordonnées du client : même cascade que les factures FAC. */
async function coordonnees(supabase: any, payment: any): Promise<Client> {
  const sale = payment.sales;
  const contact = payment.contacts;
  const champs = "full_name, email, phone, address, postal_code, city, country";
  let profil: any = null;
  if (sale?.buyer_profile_id) {
    profil = (await supabase.from("profiles").select(champs).eq("id", sale.buyer_profile_id).maybeSingle()).data;
  }
  if (!profil && contact?.email) {
    profil = (await supabase.from("profiles").select(champs).ilike("email", contact.email).limit(1).maybeSingle()).data;
  }
  if (!profil && contact?.full_name) {
    const nom = String(contact.full_name).trim().replace(/\s+/g, " ");
    if (nom.length >= 3) {
      const { data } = await supabase.from("profiles").select(champs).ilike("full_name", nom).limit(2);
      if (data && data.length === 1) profil = data[0];
    }
  }
  return {
    nom: String(profil?.full_name || contact?.full_name || "Client").trim().toUpperCase(),
    email: (profil?.email || contact?.email || "").trim() || null,
    telephone: (profil?.phone || contact?.phone_normalized || "").trim() || null,
    adresse: majOuNull(profil?.address),
    code_postal: majOuNull(profil?.postal_code),
    ville: majOuNull(profil?.city),
    pays: majOuNull(profil?.country),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profil?.role !== "ceo") return json({ error: "Forbidden" }, 403);

    const body = await req.json();
    let facture: any = null;

    if (body.facture_id) {
      facture = (await supabase.from("factures_recouvrement").select("*").eq("id", body.facture_id).maybeSingle()).data;
      if (!facture) return json({ error: "Facture introuvable" }, 404);
    } else if (body.payment_id) {
      const { data: payment, error } = await supabase
        .from("payments")
        .select(`id, status, sales!payments_sale_id_fkey(id, product, buyer_profile_id),
                 contacts!payments_contact_id_fkey(id, full_name, email, phone_normalized)`)
        .eq("id", body.payment_id)
        .single();
      if (error || !payment) return json({ error: "Echeance introuvable" }, 404);
      if (payment.status === "paid") return json({ error: "Echeance deja payee : pas de facture de recouvrement" }, 400);

      const client = await coordonnees(supabase, payment);
      const { data, error: rpcErr } = await supabase.rpc("creer_facture_recouvrement", {
        p_payment_id: payment.id,
        p_client: client,
        p_produit: libelleFacture((payment.sales as any)?.product),
        p_created_by: user.id,
      });
      if (rpcErr || !data) return json({ error: "Creation impossible", detail: rpcErr?.message }, 400);
      facture = data;
    } else {
      return json({ error: "payment_id ou facture_id requis" }, 400);
    }

    // Le PDF : produit s'il manque, ou reproduit à la demande (même numéro, même date).
    if (!facture.pdf_path || body.regenerer === true) {
      const chemin = `recouvrement/${facture.numero}.pdf`;
      const pdf = await genererPdf({
        numero: facture.numero,
        dateFacture: facture.date_facture,
        montant: Number(facture.montant),
        paymentNumber: facture.payment_number,
        totalPayments: facture.total_payments,
        produit: facture.produit || "PASS AL BARAKA",
        client: {
          nom: facture.client_nom,
          email: facture.client_email,
          telephone: facture.client_telephone,
          adresse: facture.client_adresse,
          code_postal: facture.client_code_postal,
          ville: facture.client_ville,
          pays: facture.client_pays,
        },
      });
      const { error: upErr } = await supabase.storage.from("invoices").upload(chemin, pdf, { contentType: "application/pdf", upsert: true });
      if (upErr) return json({ error: "Depot du PDF impossible", detail: upErr.message, facture }, 500);
      const { data: maj } = await supabase.from("factures_recouvrement").update({ pdf_path: chemin }).eq("id", facture.id).select().single();
      facture = maj ?? { ...facture, pdf_path: chemin };
    }

    return json({ ok: true, facture });
  } catch (err: any) {
    console.error("generer-facture-recouvrement:", err);
    return json({ error: err?.message ?? String(err) }, 500);
  }
});
