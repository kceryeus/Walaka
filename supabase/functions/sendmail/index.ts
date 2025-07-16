// DEPRECATED - DELETE: Email logic moved to Node.js backend.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let to, subject, message;
  try {
    ({ to, subject, message } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!to || !subject || !message) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  // Get env vars
  const SMTP_HOST = Deno.env.get("SMTP_HOSTNAME");
  const SMTP_PORT = Number(Deno.env.get("SMTP_PORT"));
  const SMTP_USER = Deno.env.get("SMTP_USERNAME");
  const SMTP_PASS = Deno.env.get("SMTP_PASSWORD");
  const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL");

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SENDER_EMAIL) {
    return new Response(JSON.stringify({ error: "SMTP environment variables not set" }), { status: 500 });
  }

  const client = new SmtpClient();

  try {
    // Use TLS if port is 465, otherwise plain
    if (SMTP_PORT === 465) {
      await client.connectTLS({
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        username: SMTP_USER,
        password: SMTP_PASS,
      });
    } else {
      await client.connect({
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        username: SMTP_USER,
        password: SMTP_PASS,
      });
    }

    await client.send({
      from: SENDER_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      content: message,
      html: message,
    });

    await client.close();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}); 