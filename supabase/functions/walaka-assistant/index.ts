// supabase/functions/walaka-assistant/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
serve(async (req)=>{
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405
    });
  }
  // Get the OpenRouter API key from environment variables
  const OPENROUTER_API_KEY = Deno.env.get("OpenRouterAI");
  if (!OPENROUTER_API_KEY) {
    return new Response("Missing OpenRouter API key", {
      status: 500
    });
  }
  // Parse the request body
  let body;
  try {
    body = await req.json();
  } catch  {
    return new Response("Invalid JSON", {
      status: 400
    });
  }
  const { messages } = body;
  if (!messages) {
    return new Response("Missing 'messages' in request body", {
      status: 400
    });
  }
  // Dynamically set HTTP-Referer based on request origin
  // Fallback to production domain if not present
  let referer = req.headers.get("origin") || req.headers.get("referer") || "https://walakasoftware.com";
  // Call OpenRouter API
  const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "WALAKA ERP"
    },
    body: JSON.stringify({
      model: "qwen/qwen3-30b-a3b:free",
      messages
    })
  });
  const data = await openRouterRes.json();
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json"
    }
  });
});
