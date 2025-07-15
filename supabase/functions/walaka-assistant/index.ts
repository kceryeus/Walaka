// supabase/functions/walaka-assistant/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Parse request body
  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { messages } = body;
  if (!messages) {
    return new Response(JSON.stringify({ error: "Missing 'messages' in request body" }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  // Get the OpenRouter API key from Supabase secrets
  const OPENROUTER_API_KEY = Deno.env.get("OpenRouterAI");
  if (!OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing OpenRouter API key" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  // Call OpenRouter API
  const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://walakasoftware.com",
      "X-Title": "WALAKA ERP"
    },
    body: JSON.stringify({
      model: "qwen/qwen3-30b-a3b:free", // You can change the model if needed
      messages
    })
  });

  const data = await openRouterRes.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
