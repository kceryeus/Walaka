import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, invoice, pdfBase64 } = await req.json()

    const client = new SmtpClient()

    await client.connectTLS({
      hostname: Deno.env.get('SMTP_HOST')!,
      port: parseInt(Deno.env.get('SMTP_PORT')!),
      username: Deno.env.get('SMTP_USERNAME')!,
      password: Deno.env.get('SMTP_PASSWORD')!,
    })

    await client.send({
      from: Deno.env.get('SMTP_FROM')!,
      to: to,
      subject: subject,
      content: `Your invoice ${invoice.invoice_number} is attached.`,
      attachments: [{
        filename: `invoice-${invoice.invoice_number}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
      }],
    })

    await client.close()

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
