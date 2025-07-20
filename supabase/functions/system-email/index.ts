// DEPRECATED - DELETE: Email logic moved to Node.js backend.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { to, subject, message } = body;
  if (!to || !subject || !message) {
    return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, message' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // SMTP config from environment
  const SMTP_HOSTNAME = Deno.env.get('SMTP_HOSTNAME') ?? '';
  const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') ?? '587');
  const SMTP_USERNAME = Deno.env.get('SMTP_USERNAME') ?? '';
  const SMTP_PASSWORD = Deno.env.get('SMTP_PASSWORD') ?? '';
  const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') ?? '';

  if (!SMTP_HOSTNAME || !SMTP_PORT || !SMTP_USERNAME || !SMTP_PASSWORD || !SENDER_EMAIL) {
    return new Response(JSON.stringify({ error: 'Missing SMTP configuration in environment variables' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  try {
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: SMTP_HOSTNAME,
      port: SMTP_PORT,
      username: SMTP_USERNAME,
      password: SMTP_PASSWORD,
    });

    await client.send({
      from: SENDER_EMAIL,
      to,
      subject,
      content: message,
    });
    await client.close();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
}); 