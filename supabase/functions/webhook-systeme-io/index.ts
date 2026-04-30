import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_SOURCES = ['vsl_a', 'vsl_b', 'vsl_webi']
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const

type UtmKey = typeof UTM_KEYS[number]
type Utm = Partial<Record<UtmKey, string>>

function formatFullName(name: string | null | undefined): string | null {
  if (!name) return null
  return name.trim().toUpperCase()
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

// Parcourt récursivement le payload à la recherche de strings qui ressemblent
// à des URLs avec des UTM. Retourne la première URL trouvée + le chemin où elle
// a été trouvée (debug). Limite la profondeur pour éviter les boucles infinies.
function findUrlWithUtm(obj: unknown, path: string = '', depth: number = 0): { url: string; path: string } | null {
  if (depth > 6 || obj === null || obj === undefined) return null

  if (typeof obj === 'string') {
    // Heuristique : contient http(s):// et au moins un utm_*
    if (/^https?:\/\//i.test(obj) && /[?&]utm_/i.test(obj)) {
      return { url: obj, path }
    }
    return null
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const found = findUrlWithUtm(obj[i], `${path}[${i}]`, depth + 1)
      if (found) return found
    }
    return null
  }

  if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const found = findUrlWithUtm(value, path ? `${path}.${key}` : key, depth + 1)
      if (found) return found
    }
  }

  return null
}

// Tente d'extraire les UTM directement depuis des champs nommés utm_* dans le payload
// (fallback si pas d'URL détectée). Cherche en profondeur dans n'importe quel objet.
function findDirectUtmFields(obj: unknown, depth: number = 0): Utm {
  if (depth > 6 || obj === null || obj === undefined || typeof obj !== 'object') return {}
  const out: Utm = {}

  const visit = (o: unknown, d: number) => {
    if (d > 6 || o === null || o === undefined || typeof o !== 'object') return
    if (Array.isArray(o)) {
      for (const item of o) visit(item, d + 1)
      return
    }
    for (const [key, value] of Object.entries(o as Record<string, unknown>)) {
      const lk = key.toLowerCase()
      if ((UTM_KEYS as readonly string[]).includes(lk) && typeof value === 'string' && value.length > 0) {
        if (!out[lk as UtmKey]) out[lk as UtmKey] = value
      } else if (typeof value === 'object') {
        visit(value, d + 1)
      }
    }
  }
  visit(obj, depth)
  return out
}

function parseUtmFromUrl(url: string): Utm {
  try {
    const u = new URL(url)
    const out: Utm = {}
    for (const k of UTM_KEYS) {
      const v = u.searchParams.get(k)
      if (v) out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

// Stratégie de parsing UTM :
//   1. Cherche une URL avec UTM dans le payload (le plus fiable)
//   2. Si pas trouvée, cherche des champs nommés utm_* directement dans le payload
//   3. Sinon : pas d'UTM (renvoie objet vide)
function extractUtm(payload: unknown): { utm: Utm; sourceUrl: string | null; notes: string } {
  const found = findUrlWithUtm(payload)
  if (found) {
    const utm = parseUtmFromUrl(found.url)
    if (Object.keys(utm).length > 0) {
      return { utm, sourceUrl: found.url, notes: `Parsed from URL at: ${found.path}` }
    }
  }
  const direct = findDirectUtmFields(payload)
  if (Object.keys(direct).length > 0) {
    return { utm: direct, sourceUrl: null, notes: 'Parsed from direct utm_* fields in payload' }
  }
  return { utm: {}, sourceUrl: null, notes: 'No URL with UTM found, no direct utm_* fields found' }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // Variables remontées dans l'archive même en cas d'erreur partielle
  let archivedPayload: unknown = null
  let archivedSource: string | null = null
  let archivedSystemeIoId: string | null = null
  let archivedContactId: string | null = null
  let archivedLeadId: string | null = null
  let archivedUtm: Utm = {}
  let archivedSourceUrl: string | null = null
  let archivedParseNotes: string = ''

  try {
    const url = new URL(req.url)
    const source = url.searchParams.get('source')
    archivedSource = source

    if (!source || !VALID_SOURCES.includes(source)) {
      return new Response(
        JSON.stringify({ error: 'Source invalide. Valeurs acceptées: ' + VALID_SOURCES.join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = await req.json()
    archivedPayload = payload
    console.log('Webhook Systeme IO reçu:', JSON.stringify(payload))

    // Parsing UTM (avant traitement métier pour qu'on archive même si le contact est invalide)
    const { utm, sourceUrl, notes } = extractUtm(payload)
    archivedUtm = utm
    archivedSourceUrl = sourceUrl
    archivedParseNotes = notes
    console.log('UTM extraits:', utm, '| URL:', sourceUrl, '| notes:', notes)

    const contact = payload.data?.contact
    if (!contact) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide: pas de contact' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawEmail = contact.email
    const rawPhone = contact.fields?.phone_number || contact.fields?.phone
    const rawFullName = contact.fields?.first_name || contact.fields?.name
    const systemeIoId = contact.id?.toString() ?? null
    archivedSystemeIoId = systemeIoId

    const email = formatEmail(rawEmail)
    const phone = formatPhoneE164(rawPhone)
    const fullName = formatFullName(rawFullName)

    if (!email && !phone) {
      return new Response(
        JSON.stringify({ error: 'Email ou téléphone requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Données formatées:', { email, phone, fullName, systemeIoId })

    const { data: contactId, error: contactError } = await supabase
      .rpc('find_or_create_contact', {
        p_email: email,
        p_phone: phone,
        p_full_name: fullName
      })

    if (contactError) throw contactError
    archivedContactId = contactId

    // Dédup technique 10s (retry instantané)
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString()
    const { data: recentLead } = await supabase
      .from('leads')
      .select('id')
      .eq('contact_id', contactId)
      .eq('source_detail', source)
      .gte('created_at', tenSecondsAgo)
      .single()

    if (recentLead) {
      archivedLeadId = recentLead.id
      return new Response(
        JSON.stringify({ success: true, message: 'Doublon technique ignoré', lead_id: recentLead.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        contact_id: contactId,
        source: 'meta_ads',
        source_detail: source,
        systeme_io_id: systemeIoId,
        raw_full_name: rawFullName,
        raw_email: rawEmail,
        raw_phone: rawPhone,
        status: 'a_qualifier',
        utm_source:   utm.utm_source   ?? null,
        utm_medium:   utm.utm_medium   ?? null,
        utm_campaign: utm.utm_campaign ?? null,
        utm_content:  utm.utm_content  ?? null,
        utm_term:     utm.utm_term     ?? null,
      })
      .select()
      .single()

    if (leadError) throw leadError
    archivedLeadId = lead.id

    console.log('Lead créé:', lead.id, '| UTM:', utm)

    return new Response(
      JSON.stringify({ success: true, contact_id: contactId, lead_id: lead.id, source, utm }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur webhook:', error)
    archivedParseNotes = (archivedParseNotes ? archivedParseNotes + ' | ' : '') + 'ERREUR: ' + (error?.message ?? String(error))
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } finally {
    // Archive systématique (même en cas d'erreur) pour pouvoir analyser
    if (archivedPayload !== null) {
      try {
        await supabase
          .from('webhook_systeme_io_payloads')
          .insert({
            source:        archivedSource,
            systeme_io_id: archivedSystemeIoId,
            contact_id:    archivedContactId,
            lead_id:       archivedLeadId,
            utm_source:    archivedUtm.utm_source   ?? null,
            utm_medium:    archivedUtm.utm_medium   ?? null,
            utm_campaign:  archivedUtm.utm_campaign ?? null,
            utm_content:   archivedUtm.utm_content  ?? null,
            utm_term:      archivedUtm.utm_term     ?? null,
            source_url:    archivedSourceUrl,
            payload:       archivedPayload,
            parse_notes:   archivedParseNotes,
          })
      } catch (archErr) {
        console.error('Erreur archivage payload (non-bloquant):', archErr)
      }
    }
  }
})
