import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_SOURCES = ['vsl_a', 'vsl_b', 'vsl_webi']
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
const SYSTEME_IO_API_TIMEOUT_MS = 5000

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

// Recherche récursive d'une URL avec UTM dans le payload (tentative rapide)
function findUrlWithUtm(obj: unknown, path: string = '', depth: number = 0): { url: string; path: string } | null {
  if (depth > 6 || obj === null || obj === undefined) return null
  if (typeof obj === 'string') {
    if (/^https?:\/\//i.test(obj) && /[?&]utm_/i.test(obj)) return { url: obj, path }
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

function findDirectUtmFields(obj: unknown, depth: number = 0): Utm {
  if (depth > 6 || obj === null || obj === undefined || typeof obj !== 'object') return {}
  const out: Utm = {}
  const visit = (o: unknown, d: number) => {
    if (d > 6 || o === null || o === undefined || typeof o !== 'object') return
    if (Array.isArray(o)) { for (const item of o) visit(item, d + 1); return }
    for (const [key, value] of Object.entries(o as Record<string, unknown>)) {
      const lk = key.toLowerCase()
      if ((UTM_KEYS as readonly string[]).includes(lk) && typeof value === 'string' && value.length > 0) {
        if (!out[lk as UtmKey]) out[lk as UtmKey] = value
      } else if (typeof value === 'object') visit(value, d + 1)
    }
  }
  visit(obj, depth)
  return out
}

function parseUtmFromUrl(url: string | null | undefined): Utm {
  if (!url || typeof url !== 'string') return {}
  try {
    const u = new URL(url)
    const out: Utm = {}
    for (const k of UTM_KEYS) {
      const v = u.searchParams.get(k)
      if (v) out[k] = v
    }
    return out
  } catch { return {} }
}

// 1. Cherche dans le payload (rapide, sans appel réseau)
function extractUtmFromPayload(payload: unknown): { utm: Utm; sourceUrl: string | null; notes: string } {
  const found = findUrlWithUtm(payload)
  if (found) {
    const utm = parseUtmFromUrl(found.url)
    if (Object.keys(utm).length > 0) {
      return { utm, sourceUrl: found.url, notes: `payload-url:${found.path}` }
    }
  }
  const direct = findDirectUtmFields(payload)
  if (Object.keys(direct).length > 0) {
    return { utm: direct, sourceUrl: null, notes: 'payload-direct-fields' }
  }
  return { utm: {}, sourceUrl: null, notes: 'payload-no-match' }
}

// 2. Fallback API Systeme.io : récupère le contact et son sourceURL
async function fetchUtmFromApi(systemeIoId: string, apiKey: string): Promise<{ utm: Utm; sourceUrl: string | null; notes: string }> {
  if (!systemeIoId || !apiKey) {
    return { utm: {}, sourceUrl: null, notes: 'api-skip:missing-id-or-key' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SYSTEME_IO_API_TIMEOUT_MS)
  try {
    const resp = await fetch(`https://api.systeme.io/api/contacts/${systemeIoId}`, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'accept': 'application/json' },
      signal: controller.signal,
    })
    if (!resp.ok) {
      return { utm: {}, sourceUrl: null, notes: `api-http-${resp.status}` }
    }
    const contact = await resp.json()
    const sourceUrl: string | null = contact?.sourceURL ?? contact?.sourceUrl ?? null
    const utm = parseUtmFromUrl(sourceUrl)
    return { utm, sourceUrl, notes: Object.keys(utm).length > 0 ? 'api-ok' : 'api-no-utm-in-source-url' }
  } catch (e: any) {
    return { utm: {}, sourceUrl: null, notes: `api-exception:${e?.name ?? 'Error'}` }
  } finally {
    clearTimeout(timer)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

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

    // ============================================================
    // Extraction UTM : payload d'abord (rapide), API Systeme.io en
    // fallback si rien trouvé dans le payload. Garantit qu'on capte
    // les UTM via le sourceURL exposé par l'API même si Systeme.io
    // ne les met pas dans son webhook payload.
    // ============================================================
    const fromPayload = extractUtmFromPayload(payload)
    let utm: Utm = fromPayload.utm
    let sourceUrl: string | null = fromPayload.sourceUrl
    let notes: string = fromPayload.notes

    if (Object.keys(utm).length === 0 && systemeIoId) {
      // Aucun UTM dans le payload → fallback API
      const { data: keyRow } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'systeme_io_api_key')
        .maybeSingle()
      const stored = keyRow?.value
      const apiKey: string = typeof stored === 'string' ? stored : (stored ?? '')

      if (apiKey) {
        const fromApi = await fetchUtmFromApi(systemeIoId, apiKey)
        utm = fromApi.utm
        sourceUrl = fromApi.sourceUrl
        notes = `${fromPayload.notes} → ${fromApi.notes}`
      } else {
        notes = `${fromPayload.notes} → api-skip:no-key-in-app-settings`
      }
    }

    archivedUtm = utm
    archivedSourceUrl = sourceUrl
    archivedParseNotes = notes
    console.log('UTM final:', utm, '| URL:', sourceUrl, '| notes:', notes)

    const { data: contactId, error: contactError } = await supabase
      .rpc('find_or_create_contact', {
        p_email: email,
        p_phone: phone,
        p_full_name: fullName
      })

    if (contactError) throw contactError
    archivedContactId = contactId

    // Fenêtre de dédoublonnage 24h sur (contact_id, source_detail).
    // Étendue depuis 10s → 24h car Systeme.io fan-out parfois plusieurs
    // events pour une même action utilisateur (opt-in confirm, tag added,
    // double opt-in, etc.) qui arrivent à plusieurs minutes d'écart.
    // Au-delà de 24h, on considère que c'est un vrai re-engagement.
    const dayAgo = new Date(Date.now() - 86_400_000).toISOString()
    const { data: recentLead } = await supabase
      .from('leads')
      .select('id')
      .eq('contact_id', contactId)
      .eq('source_detail', source)
      .gte('created_at', dayAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentLead) {
      archivedLeadId = recentLead.id
      return new Response(
        JSON.stringify({ success: true, message: 'Doublon technique ignoré (fenêtre 24h)', lead_id: recentLead.id }),
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
      JSON.stringify({ success: true, contact_id: contactId, lead_id: lead.id, source, utm, parse_notes: notes }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Erreur webhook:', error)
    archivedParseNotes = (archivedParseNotes ? archivedParseNotes + ' | ' : '') + 'ERREUR: ' + (error?.message ?? String(error))
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } finally {
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
