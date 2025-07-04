import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body
    const { email, username, role = 'viewer', creator_id } = await req.json()

    // First create the auth user with email confirmation enabled
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false, // This will send a confirmation email
      user_metadata: { username, role }
    })

    if (authError) throw authError

    // After creating the auth user, fetch the creator's environment_id if available
    let environment_id = null;
    if (creator_id) {
      const { data: creator, error: creatorError } = await supabaseAdmin
        .from('users')
        .select('environment_id')
        .eq('id', creator_id)
        .single();
      if (!creatorError && creator) {
        environment_id = creator.environment_id;
      }
    }

    // Then create the user profile in the users table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          username,
          role,
          status: 'pending',
          created_at: new Date().toISOString(),
          environment_id // Set environment_id from creator
        }
      ])
      .select()
      .single()

    if (profileError) throw profileError

    return new Response(
      JSON.stringify({ data: profileData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
