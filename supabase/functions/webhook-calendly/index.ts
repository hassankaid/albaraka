import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_VITRINE = 'site_vitrine'
const COACHING_INDIVIDUEL = 'coaching_individuel'

const EVENT_TYPE_MAPPING: Record<string, string> = {
  // ── Agendas VIVANTS (verifies via l'API Calendly le 24/08/2026) ──
  '29475949-1729-46d9-a073-9587e8a655c5': 'inscription_conference', // /appel-conference
  '2ce9ca9a-2bfd-435c-a1e6-87fc9716f2c7': 'appel_vsl_tunnel',       // agenda sous la video du tunnel VSL
  '5123cdb3-bf46-4492-910f-b958f7f99f06': 'appel_temoignages',      // bouton de la page /temoignages

  // ── Agendas des tunnels de vente (releves le 22/09/2026) ──
  // UUID lus sur l'API publique de reservation de Calendly, puis VERIFIES :
  // la meme lecture rend 29475949-… pour « INSCRIPTION CONFERENCE », soit
  // exactement l'UUID deja present ci-dessus. Les deux espaces d'identifiants
  // coincident donc, et ceux-ci sont surs.
  'db3f5dde-0a79-4130-9a28-709478fa9835': 'tunnel_liberty',         // event.../liberty
  '7becdc54-4834-4863-8eab-fab2af2928c0': 'al_baraka_200',          // event.../al-baraka-200
  'd81763ec-39d2-4ca0-be42-fc61f04fd484': 'rediffusion_conference', // /redif et /rdv-rediffusion

  // ── Site vitrine (29/09/2026) : calendly.com/d/dz73-r3j-q2v/site-web-al-baraka ──
  // Remplace le formulaire du site. UUID lu sur l'API publique de reservation
  // (scheduling_links/dz73-r3j-q2v -> share 1376eaf2-… -> event_types/lookup).
  '655fa72e-bde0-4a12-a6bf-b10cf1d5fe68': SITE_VITRINE,

  // ── Coaching individuel payant avec Sabrina (03/11/2026) ──
  // calendly.com/d/d36b-3v4-xk6/coaching-individuel-al-baraka, UUID lu sur l'API
  // publique de réservation. Ces rendez-vous ne vont PAS dans calls (voir plus bas).
  'b8c343d6-1ff4-44a6-b81c-ead7aa03a104': COACHING_INDIVIDUEL,

  // ── Agendas SUPPRIMES (round-robin perdus avec les licences, 08/2026) ──
  // Conserves VOLONTAIREMENT : `replay-calendly-webhook` peut rejouer un
  // ancien echec qui les reference encore. Ils ne matcheront aucun nouveau
  // rendez-vous, les types n'existant plus.
  '2661d582-c990-4c9d-828d-9ce357da243c': 'appel_offert_vsl_a',
  'ee0de510-a1cf-4156-9c98-a5302149dc29': 'appel_offert_vsl_b',
  '17c649be-a27f-48a9-a0f8-704b8c2dfafa': 'appel_organique',
  'e673a644-4ed6-406a-b593-72a60408cbe0': 'appel_setting_webi',
}

// Correspondance STRICTEMENT par UUID de type d'evenement (decision Hassan du
// 02/08/2026 : pas de repli par nom, juge approximatif). Un type absent
// retombe sur le nom brut Calendly — instable, car il change si quelqu'un
// renomme l'evenement.
//
// ⚠️ LES UUID CHANGENT A CHAQUE RECREATION D'AGENDA. Les deux agendas
// recrees le 24/08/2026 (tunnel VSL, page temoignages) n'etaient pas branches :
// leurs rendez-vous seraient remontes sous un libelle brut. Ajoutes ci-dessus.
//
// POUR RETROUVER UN UUID : l'API Calendly seule le donne (la page publique de
// reservation ne l'expose pas), et son jeton ne vit que dans les secrets
// Supabase. Passer par `audit-calendly-history` en mode `event_types` — il
// balaie l'organisation ET chaque membre, car les agendas d'equipe
// (`calendly.com/d/...`) n'apparaissent pas dans la seule liste de
// l'organisation.
function resolveEventType(eventTypeId: string | null, name: string | null | undefined): string {
  if (eventTypeId && EVENT_TYPE_MAPPING[eventTypeId]) return EVENT_TYPE_MAPPING[eventTypeId]
  return name || 'inconnu'
}

function formatFullName(firstName: string | null | undefined, lastName: string | null | undefined): string | null {
  const parts = [firstName, lastName].filter(Boolean).join(' ')
  if (!parts) return null
  return parts.trim().toUpperCase()
}

function formatEmail(email: string | null | undefined): string | null {
  if (!email) return null
  return email.trim().toLowerCase()
}

function formatPhoneE164(phone: string | null | undefined): string | null {
  if (!phone) return null
  let cleaned = phone.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('00')) cleaned = '+' + cleaned.slice(2)
  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('212') && cleaned.length >= 12) cleaned = '+' + cleaned
    else if (cleaned.startsWith('0') && cleaned.length === 10) cleaned = '+33' + cleaned.slice(1)
    else if (cleaned.length === 9) cleaned = '+33' + cleaned
    else cleaned = '+' + cleaned
  }
  return cleaned
}

function extractEventTypeId(uri: string): string | null {
  const match = uri.match(/event_types\/([a-f0-9-]+)/i)
  return match ? match[1] : null
}

function extractPhoneFromQuestions(questions: any[]): string | null {
  if (!questions || !Array.isArray(questions)) return null
  const phoneQuestion = questions.find(q =>
    q.question?.toLowerCase().includes('whatsapp') ||
    q.question?.toLowerCase().includes('numéro') ||
    q.question?.toLowerCase().includes('phone') ||
    q.question?.toLowerCase().includes('téléphone')
  )
  return phoneQuestion?.answer || null
}

/** Coeur de traitement extractible : utilisé par le webhook ET par replay-calendly-webhook */
export async function processCalendlyPayload(payload: any, supabase: any): Promise<{ success: boolean; result?: any; error?: string; created_call_id?: string }> {
  const event = payload.event
  const data = payload.payload

  if (!['invitee.created', 'invitee.canceled'].includes(event)) {
    return { success: true, result: { message: 'Event ignoré: ' + event } }
  }

  const scheduledEvent = data.scheduled_event || {}
  const cancellation = data.cancellation || {}
  const rawEmail = data.email
  const rawFirstName = data.first_name
  const rawLastName = data.last_name
  const rawPhone = extractPhoneFromQuestions(data.questions_and_answers)
  const rawFullName = [rawFirstName, rawLastName].filter(Boolean).join(' ')
  const calendlyEventUri = scheduledEvent.uri
  const scheduledAt = scheduledEvent.start_time
  const duration = scheduledEvent.duration || 30
  const eventTypeUri = scheduledEvent.event_type || ''
  const eventTypeId = extractEventTypeId(eventTypeUri)
  const eventType = resolveEventType(eventTypeId, scheduledEvent.name)
  const hostEmail = scheduledEvent.event_memberships?.[0]?.user_email
  const email = formatEmail(rawEmail)
  const phone = formatPhoneE164(rawPhone)
  const fullName = formatFullName(rawFirstName, rawLastName)

  if (!email && !phone) {
    return { success: false, error: 'Email ou téléphone requis dans le payload' }
  }
  if (!calendlyEventUri) {
    return { success: false, error: 'scheduled_event.uri manquant dans le payload' }
  }

  // find_or_create_contact
  const { data: contactId, error: contactError } = await supabase.rpc('find_or_create_contact', {
    p_email: email, p_phone: phone, p_full_name: fullName,
  })
  if (contactError) return { success: false, error: `find_or_create_contact: ${contactError.message}` }
  if (!contactId) return { success: false, error: 'find_or_create_contact a renvoyé null' }

  // ── ANNULATION ──
  // COACHING INDIVIDUEL (03/11/2026) : ni un RDV de vente ni un closing. On le
  // range dans coaching_reservations, sans créer d'appel ni toucher au lead (une
  // annulation remettrait sinon le lead de l'élève en « contacté »). Une
  // réservation sans paiement de coaching retrouvé prévient le CEO : l'agenda
  // public reste réservable par qui en a le lien.
  if (eventType === COACHING_INDIVIDUEL) {
    if (event === 'invitee.canceled') {
      await supabase.from('coaching_reservations')
        .update({ statut: 'annule', annule_le: cancellation.canceled_at || new Date().toISOString() })
        .eq('calendly_event_uri', calendlyEventUri)
      return { success: true, result: { message: 'Coaching annulé', calendly_event_uri: calendlyEventUri } }
    }

    let coachId: string | null = null
    if (hostEmail) {
      const hote = hostEmail.toLowerCase()
      const { data: parCalendly } = await supabase.from('profiles').select('id').eq('calendly_email', hote).maybeSingle()
      const { data: parEmail } = parCalendly ? { data: null } : await supabase.from('profiles').select('id').eq('email', hote).maybeSingle()
      coachId = parCalendly?.id ?? parEmail?.id ?? null
    }

    // Le paiement : un lien de coaching payé par ce contact, dont le lien de
    // réservation a été remis, et pas encore rattaché à une autre réservation.
    const { data: payes } = await supabase
      .from('payment_links')
      .select('id, sale_id, offre_coaching, paid_at, sales!inner(contact_id)')
      .not('offre_coaching', 'is', null)
      .not('sale_id', 'is', null)
      .eq('sales.contact_id', contactId)
      .order('paid_at', { ascending: false })
    let paiement: any = null
    for (const p of payes ?? []) {
      const { data: dejaPris } = await supabase.from('coaching_reservations')
        .select('id').eq('payment_link_id', p.id).neq('calendly_event_uri', calendlyEventUri).limit(1)
      if (!dejaPris || dejaPris.length === 0) { paiement = p; break }
    }

    const { error: resaError } = await supabase.from('coaching_reservations').upsert({
      calendly_event_uri: calendlyEventUri,
      offre_coaching: paiement?.offre_coaching ?? 'coaching-individuel',
      payment_link_id: paiement?.id ?? null,
      sale_id: paiement?.sale_id ?? null,
      contact_id: contactId,
      coach_id: coachId,
      invitee_nom: rawFullName || fullName,
      invitee_email: email,
      scheduled_at: scheduledAt,
      statut: 'planifie',
      paye: !!paiement,
    }, { onConflict: 'calendly_event_uri' })
    if (resaError) return { success: false, error: `Insert coaching_reservations: ${resaError.message}` }

    if (!paiement) {
      const quand = scheduledAt
        ? new Date(scheduledAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })
        : 'date inconnue'
      const { data: ceos } = await supabase.from('profiles').select('id').eq('role', 'ceo')
      for (const c of ceos ?? []) {
        await supabase.from('notifications').insert({
          user_id: c.id,
          type: 'coaching_sans_paiement',
          title: 'Coaching réservé sans paiement',
          body: `${rawFullName || fullName || email} a réservé un coaching individuel le ${quand}, sans paiement de coaching retrouvé à son nom.`,
          metadata: { calendly_event_uri: calendlyEventUri, email, contact_id: contactId },
        })
      }
    }
    return { success: true, result: { message: 'Coaching enregistré', paye: !!paiement, contact_id: contactId } }
  }

  if (event === 'invitee.canceled') {
    const canceledAt = cancellation.canceled_at || new Date().toISOString()
    const canceledBy = cancellation.canceler_type || 'unknown'
    const cancellationReason = cancellation.reason || null

    const { data: updatedCall, error: updateError } = await supabase
      .from('calls')
      .update({ status: 'annule', canceled_at: canceledAt, canceled_by: canceledBy, cancellation_reason: cancellationReason })
      .eq('calendly_event_id', calendlyEventUri)
      .select()
      .maybeSingle()
    if (updateError) return { success: false, error: `Update call (cancel): ${updateError.message}` }

    if (updatedCall?.lead_id) {
      await supabase.from('leads').update({ status: 'contacte' }).eq('id', updatedCall.lead_id)
    }
    return { success: true, result: { message: 'Call annulé', calendly_event_uri: calendlyEventUri } }
  }

  // ── CRÉATION ──
  // Idempotence : check si call existe déjà
  const { data: existingCall } = await supabase
    .from('calls').select('id').eq('calendly_event_id', calendlyEventUri).maybeSingle()
  if (existingCall) {
    return { success: true, result: { message: 'Call déjà existant', call_id: existingCall.id }, created_call_id: existingCall.id }
  }

  // Host → assigned_to
  let assignedTo: string | null = null
  if (hostEmail) {
    const hostEmailLower = hostEmail.toLowerCase()
    const { data: hostByCalendly } = await supabase
      .from('profiles').select('id').eq('calendly_email', hostEmailLower).maybeSingle()
    if (hostByCalendly) assignedTo = hostByCalendly.id
    else {
      const { data: hostByEmail } = await supabase
        .from('profiles').select('id').eq('email', hostEmailLower).maybeSingle()
      assignedTo = hostByEmail?.id ?? null
    }
  }

  // Lead existant (le plus récent non converti)
  let { data: existingLead } = await supabase
    .from('leads').select('id').eq('contact_id', contactId).neq('status', 'converti')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  // Site vitrine : la réservation EST la demande. Elle doit apparaître dans les
  // Leads sous « Site vitrine » (organique), comme le faisait le formulaire —
  // décision Hassan du 28/09, reconduite le 29/09 avec l'agenda Calendly.
  // Titulaire = le commercial que le round-robin a désigné pour l'appel : le
  // lead et le rendez-vous restent chez la même personne. Une fiche site
  // encore ouverte est réutilisée (replanification), pas dupliquée.
  if (eventType === SITE_VITRINE) {
    const { data: ficheSite } = await supabase
      .from('leads').select('id').eq('contact_id', contactId).eq('source', SITE_VITRINE)
      .not('status', 'in', '(close,perdu)')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (ficheSite) {
      existingLead = ficheSite
      await supabase.from('leads').update({ status: 'call_booke' }).eq('id', ficheSite.id)
    } else {
      const tracking = data.tracking || {}
      const quand = scheduledAt
        ? new Date(scheduledAt).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'full', timeStyle: 'short' })
        : 'date inconnue'
      const { data: nouveau, error: leadError } = await supabase
        .from('leads').insert({
          contact_id: contactId,
          source: SITE_VITRINE,
          status: 'call_booke',
          assigned_to: assignedTo,
          assigned_at: assignedTo ? new Date().toISOString() : null,
          raw_full_name: fullName,
          raw_email: email,
          raw_phone: phone,
          notes: `Rendez-vous pris sur le site vitrine (Calendly) pour le ${quand}.`,
          utm_source: tracking.utm_source || null,
          utm_medium: tracking.utm_medium || null,
          utm_campaign: tracking.utm_campaign || null,
          utm_content: tracking.utm_content || null,
          utm_term: tracking.utm_term || null,
        }).select('id').single()
      if (leadError) return { success: false, error: `Insert lead site vitrine: ${leadError.message}` }
      existingLead = nouveau
    }
  }

  // Replanification ?
  const { data: canceledCall } = await supabase
    .from('calls').select('id').eq('contact_id', contactId).eq('status', 'annule')
    .order('canceled_at', { ascending: false }).limit(1).maybeSingle()

  const { data: call, error: callError } = await supabase
    .from('calls').insert({
      contact_id: contactId,
      lead_id: existingLead?.id || null,
      calendly_event_id: calendlyEventUri,
      event_type: eventType,
      scheduled_at: scheduledAt,
      duration_minutes: duration,
      assigned_to: assignedTo,
      status: 'planifie',
      rescheduled_from: canceledCall?.id || null,
      raw_full_name: rawFullName,
      raw_email: rawEmail,
      raw_phone: rawPhone,
    }).select('id').single()

  if (callError) return { success: false, error: `Insert call: ${callError.message}` }

  return {
    success: true,
    created_call_id: call.id,
    result: { contact_id: contactId, call_id: call.id, lead_id: existingLead?.id ?? null, event_type: eventType, assigned_to: assignedTo },
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  let payload: any = null
  let headers: Record<string, string> = {}

  try {
    payload = await req.json()
    req.headers.forEach((value, key) => { headers[key] = value })

    console.log('Webhook Calendly reçu:', JSON.stringify(payload))

    const result = await processCalendlyPayload(payload, supabase)

    if (!result.success) {
      // Capture l'échec en base pour replay ultérieur
      await supabase.from('webhook_failures').insert({
        source: 'calendly',
        payload,
        headers,
        error_message: result.error || 'Unknown error',
        status_code: 500,
      })
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, ...result.result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Erreur webhook:', error)
    // Capture l'exception en base avec le payload (s'il a pu être parsé)
    try {
      await supabase.from('webhook_failures').insert({
        source: 'calendly',
        payload: payload ?? { _parse_error: 'Could not parse JSON body' },
        headers,
        error_message: error?.message || String(error),
        error_stack: error?.stack || null,
        status_code: 500,
      })
    } catch (logErr) {
      console.error('Failed to log webhook failure:', logErr)
    }
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
