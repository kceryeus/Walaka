// DEPRECATED - DELETE: Email logic moved to Node.js backend.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the request body
    const { to, subject, message, invoiceNumber, attachPdf } = await req.json()

    // Validate required fields
    if (!to || !subject || !message || !invoiceNumber) {
      throw new Error('Missing required fields')
    }

    // Get the PDF content from Supabase storage
    const { data: pdfData, error: pdfError } = await supabaseClient
      .storage
      .from('invoices')
      .download(`${invoiceNumber}.pdf`)

    if (pdfError) {
      throw new Error('Failed to get PDF: ' + pdfError.message)
    }

    // Initialize SMTP client
    const client = new SmtpClient()
    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOSTNAME') ?? '',
      port: parseInt(Deno.env.get('SMTP_PORT') ?? '587'),
      username: Deno.env.get('SMTP_USERNAME') ?? '',
      password: Deno.env.get('SMTP_PASSWORD') ?? '',
    })

    // Prepare email
    const email = {
      from: Deno.env.get('SENDER_EMAIL') ?? '',
      to,
      subject,
      content: message,
      attachments: attachPdf ? [{
        filename: `Invoice_${invoiceNumber}.pdf`,
        content: pdfData,
        contentType: 'application/pdf'
      }] : []
    }

    // Send email
    await client.send(email)
    await client.close()

    // Log successful email send
    await supabaseClient
      .from('email_logs')
      .insert([{
        invoice_number: invoiceNumber,
        recipient: to,
        subject,
        sent_at: new Date().toISOString(),
        status: 'sent'
      }])

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 