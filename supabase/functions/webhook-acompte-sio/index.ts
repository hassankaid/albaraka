import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const payload = await req.json()
    console.log('=== WEBHOOK ACOMPTE SIO REÇU ===')

    const data = payload.body?.data || payload.data
    const webhookType = payload.body?.type || payload.type

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Payload invalide: pas de data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (webhookType !== 'customer.sale.completed') {
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignoré: ' + webhookType }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const customer = data.customer
    const order = data.order
    const pricePlan = data.price_plan

    const rawEmail = customer?.email?.trim()?.toLowerCase() || null
    const rawPhone = customer?.fields?.phone_number || null
    const rawFirstName = customer?.fields?.first_name || ''
    const rawLastName = customer?.fields?.surname || ''
    const rawFullName = [rawFirstName, rawLastName].filter(Boolean).join(' ').toUpperCase() || null

    const systemeIoOrderId = order?.id?.toString()
    const productName = pricePlan?.name || 'Acompte'

    const montantAcompte = (order?.total_price || 0) / 100

    const soldAt = order?.created_at || new Date().toISOString()

    console.log('Données extraites:', {
      rawEmail, rawPhone, rawFullName,
      systemeIoOrderId, productName, montantAcompte, soldAt
    })

    if (!rawEmail && !rawPhone) {
      return new Response(
        JSON.stringify({ error: 'Email ou téléphone requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (systemeIoOrderId) {
      const { data: existingSale } = await supabase
        .from('sales')
        .select('id')
        .eq('systeme_io_order_id', systemeIoOrderId)
        .maybeSingle()

      if (existingSale) {
        console.log('⚠️ Acompte déjà existant:', existingSale.id)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Acompte déjà existant',
            sale_id: existingSale.id,
            duplicate: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const { data: contactId, error: contactError } = await supabase
      .rpc('find_or_create_contact', {
        p_email: rawEmail,
        p_phone: rawPhone,
        p_full_name: rawFullName
      })

    if (contactError) {
      console.error('Erreur matching contact:', contactError)
      throw new Error('Erreur matching contact: ' + contactError.message)
    }

    console.log('✅ Contact trouvé/créé:', contactId)

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('contact_id', contactId)
      .neq('status', 'close')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const leadId = existingLead?.id || null

    let closedBy: string | null = null
    let callId: string | null = null

    const { data: lastCall } = await supabase
      .from('calls')
      .select('id, assigned_to')
      .eq('contact_id', contactId)
      .neq('status', 'annule')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastCall) {
      callId = lastCall.id
      closedBy = lastCall.assigned_to
    }

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        contact_id: contactId,
        lead_id: leadId,
        call_id: callId,
        product: 'Acompte',
        amount_ht: montantAcompte,
        mensualites: 1,
        payment_status: 'paid',
        sold_at: soldAt,
        closed_by: closedBy,
        systeme_io_order_id: systemeIoOrderId,
        sale_type: 'acompte'
      })
      .select()
      .single()

    if (saleError) {
      console.error('Erreur création acompte:', saleError)
      throw new Error('Erreur création acompte: ' + saleError.message)
    }

    console.log('✅ Acompte créé:', sale.id)

    const soldDate = new Date(soldAt)

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        sale_id: sale.id,
        contact_id: contactId,
        payment_number: 1,
        total_payments: 1,
        amount: montantAcompte,
        due_date: soldDate.toISOString().split('T')[0],
        status: 'paid',
        paid_at: soldDate.toISOString().split('T')[0]
      })

    if (paymentError) {
      console.error('Erreur création paiement:', paymentError)
      throw new Error('Erreur création paiement: ' + paymentError.message)
    }

    console.log('✅ Paiement acompte créé')

    const response = {
      success: true,
      contact_id: contactId,
      lead_id: leadId,
      call_id: callId,
      sale_id: sale.id,
      sale_type: 'acompte',
      amount: montantAcompte
    }

    console.log('=== RÉPONSE FINALE ===', JSON.stringify(response))

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ ERREUR WEBHOOK ACOMPTE:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
