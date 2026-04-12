import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_SOURCES = ['vsl_a', 'vsl_b', 'vsl_webi']

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

  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2)
  }

  if (!cleaned.startsWith('+')) {
    if (cleaned.startsWith('212') && cleaned.length >= 12) {
      cleaned = '+' + cleaned
    } else if (cleaned.startsWith('0') && cleaned.length === 10) {
      cleaned = '+33' + cleaned.slice(1)
    } else if (cleaned.length === 9) {
      cleaned = '+33' + cleaned
    } else {
      cleaned = '+' + cleaned
    }
  }

  return cleaned
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url)
    const source = url.searchParams.get('source')

    if (!source || !VALID_SOURCES.includes(source)) {
      return new Response(
        JSON.stringify({ error: 'Source invalide. Valeurs acceptées: ' + VALID_SOURCES.join(', ') }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = await req.json()
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
    const systemeIoId = contact.id

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
    console.log('Données brutes:', { rawEmail, rawPhone, rawFullName })

    const { data: contactId, error: contactError } = await supabase
      .rpc('find_or_create_contact', {
        p_email: email,
        p_phone: phone,
        p_full_name: fullName
      })

    if (contactError) throw contactError

    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString()

    const { data: recentLead } = await supabase
      .from('leads')
      .select('id')
      .eq('contact_id', contactId)
      .eq('source_detail', source)
      .gte('created_at', tenSecondsAgo)
      .single()

    if (recentLead) {
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
        systeme_io_id: systemeIoId?.toString(),
        raw_full_name: rawFullName,
        raw_email: rawEmail,
        raw_phone: rawPhone,
        status: 'a_qualifier'
      })
      .select()
      .single()

    if (leadError) throw leadError

    console.log('Lead créé:', lead.id)

    return new Response(
      JSON.stringify({ success: true, contact_id: contactId, lead_id: lead.id, source }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Erreur webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
