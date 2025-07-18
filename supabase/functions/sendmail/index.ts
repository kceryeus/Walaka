// Email sending function with attachment support using denomailer
//
// POST body (JSON):
// {
//   to: string | string[],
//   subject: string,
//   message: string,
//   attachment?: {
//     filename: string,
//     content: string (base64),
//     contentType?: string
//   }
// }
// NOTE: Deno.env is only available in self-hosted Deno, not Deno Deploy.
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  let to, subject, message, attachment;
  try {
    ({ to, subject, message, attachment } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  if (!to || !subject || !message) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
  }

  // Get env vars (Deno.env only works in self-hosted Deno, not Deno Deploy)
  const SMTP_HOST = Deno.env.get("SMTP_HOSTNAME");
  const SMTP_PORT = Number(Deno.env.get("SMTP_PORT"));
  const SMTP_USER = Deno.env.get("SMTP_USERNAME");
  const SMTP_PASS = Deno.env.get("SMTP_PASSWORD");
  const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL");

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SENDER_EMAIL) {
    return new Response(JSON.stringify({ error: "SMTP environment variables not set" }), { status: 500 });
  }

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: {
        username: SMTP_USER,
        password: SMTP_PASS,
      },
    },
  });

  try {
    const mailOptions: any = {
      from: SENDER_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      content: message,
      html: message,
    };
    if (attachment && attachment.filename && attachment.content) {
      mailOptions.attachments = [
        {
          filename: attachment.filename,
          content: Uint8Array.from(atob(attachment.content), c => c.charCodeAt(0)),
          contentType: attachment.contentType || "application/pdf"
        }
      ];
    }
    await client.send(mailOptions);
    await client.close();
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}); 