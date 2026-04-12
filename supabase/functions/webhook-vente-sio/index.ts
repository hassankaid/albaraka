import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
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
    console.log('=== WEBHOOK VENTE SIO REÇU ===')

    const data = payload.body?.data || payload.data
    const webhookType = payload.body?.type || payload.type

    if (!data) {
      console.error('Payload invalide: pas de data')
      return new Response(
        JSON.stringify({ error: 'Payload invalide: pas de data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (webhookType !== 'customer.sale.completed') {
      console.log('Event ignoré:', webhookType)
      return new Response(
        JSON.stringify({ success: true, message: 'Event ignoré: ' + webhookType }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const customer = data.customer
    const order = data.order
    const pricePlan = data.price_plan
    const orderItem = data.order_item
    const recurringOptions = pricePlan?.recurring_options

    const rawEmail = customer?.email?.trim()?.toLowerCase() || null
    const rawPhone = customer?.fields?.phone_number || null
    const rawFirstName = customer?.fields?.first_name || ''
    const rawLastName = customer?.fields?.surname || ''
    const rawFullName = [rawFirstName, rawLastName].filter(Boolean).join(' ').toUpperCase() || null

    const systemeIoOrderId = order?.id?.toString()
    const productName = orderItem?.resources?.[0]?.data?.name || pricePlan?.name || 'Produit inconnu'

    const mensualites = recurringOptions?.limit_of_payments || 1

    const montantEcheance = (order?.total_price || 0) / 100

    const amountHt = Math.round(montantEcheance * mensualites)

    const soldAt = order?.created_at || new Date().toISOString()

    console.log('Données extraites:', {
      rawEmail, rawPhone, rawFullName,
      systemeIoOrderId, productName, amountHt, mensualites, montantEcheance, soldAt
    })

    if (!rawEmail && !rawPhone) {
      console.error('Email ou téléphone requis')
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
        console.log('⚠️ Vente déjà existante:', existingSale.id)
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Vente déjà existante',
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

    let parentSaleId: string | null = null
    let saleType: string | null = null
    let acompteAmount: number = 0

    const { data: existingAcompte } = await supabase
      .from('sales')
      .select('id, amount_ht')
      .eq('contact_id', contactId)
      .eq('sale_type', 'acompte')
      .is('parent_sale_id', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingAcompte) {
      parentSaleId = existingAcompte.id
      saleType = 'solde'
      acompteAmount = Number(existingAcompte.amount_ht)
      console.log('✅ Acompte trouvé:', parentSaleId, '- Montant:', acompteAmount, '€')
    }

    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('contact_id', contactId)
      .neq('status', 'close')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const leadId = existingLead?.id || null
    console.log('Lead trouvé:', leadId || 'aucun')

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
      console.log('✅ Dernier call trouvé:', callId, '- Closer:', closedBy)
    } else {
      console.log('Aucun call trouvé pour ce contact')
    }

    const paymentStatus = mensualites === 1 ? 'paid' : 'in_progress'

    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        contact_id: contactId,
        lead_id: leadId,
        call_id: callId,
        product: productName,
        amount_ht: amountHt,
        mensualites: mensualites,
        payment_status: paymentStatus,
        sold_at: soldAt,
        closed_by: closedBy,
        systeme_io_order_id: systemeIoOrderId,
        sale_type: saleType,
        parent_sale_id: parentSaleId
      })
      .select()
      .single()

    if (saleError) {
      console.error('Erreur création vente:', saleError)
      throw new Error('Erreur création vente: ' + saleError.message)
    }

    console.log('✅ Vente créée:', sale.id, saleType ? `(${saleType})` : '')

    if (parentSaleId) {
      const { error: acompteUpdateError } = await supabase
        .from('sales')
        .update({ parent_sale_id: sale.id, updated_at: new Date().toISOString() })
        .eq('id', parentSaleId)

      if (acompteUpdateError) {
        console.error('Erreur liaison acompte:', acompteUpdateError)
      } else {
        console.log('✅ Acompte lié au solde:', parentSaleId, '->', sale.id)
      }
    }

    if (leadId) {
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({ status: 'close', updated_at: new Date().toISOString() })
        .eq('id', leadId)

      if (leadUpdateError) {
        console.error('Erreur mise à jour lead:', leadUpdateError)
      } else {
        console.log('✅ Lead mis à jour en close:', leadId)
      }
    }

    if (callId) {
      const { error: callUpdateError } = await supabase
        .from('calls')
        .update({ status: 'close', updated_at: new Date().toISOString() })
        .eq('id', callId)

      if (callUpdateError) {
        console.error('Erreur mise à jour call:', callUpdateError)
      } else {
        console.log('✅ Call mis à jour en close:', callId)
      }
    }

    const soldDate = new Date(soldAt)
    const payments: any[] = []

    for (let i = 1; i <= mensualites; i++) {
      const dueDate = addMonths(soldDate, i - 1)

      payments.push({
        sale_id: sale.id,
        contact_id: contactId,
        payment_number: i,
        total_payments: mensualites,
        amount: montantEcheance,
        due_date: dueDate.toISOString().split('T')[0],
        status: i === 1 ? 'paid' : 'pending',
        paid_at: i === 1 ? soldDate.toISOString().split('T')[0] : null
      })
    }

    const { error: paymentsError } = await supabase
      .from('payments')
      .insert(payments)

    if (paymentsError) {
      console.error('Erreur création paiements:', paymentsError)
      throw new Error('Erreur création paiements: ' + paymentsError.message)
    }

    console.log('✅ Paiements créés:', payments.length)

    const response = {
      success: true,
      contact_id: contactId,
      lead_id: leadId,
      call_id: callId,
      sale_id: sale.id,
      sale_type: saleType,
      parent_sale_id: parentSaleId,
      acompte_amount: acompteAmount,
      closed_by: closedBy,
      payments_created: payments.length,
      product: productName,
      amount_ht: amountHt,
      mensualites: mensualites,
      montant_echeance: montantEcheance
    }

    console.log('=== RÉPONSE FINALE ===', JSON.stringify(response))

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ ERREUR WEBHOOK VENTE:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
