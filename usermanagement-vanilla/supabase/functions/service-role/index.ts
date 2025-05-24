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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, userId, userData, currentStatus } = await req.json()

    switch (action) {
      case 'fetchUsers':
        const { data: users, error: fetchError } = await supabaseClient
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError
        return new Response(JSON.stringify({ data: users }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'createUser':
        // First create the auth user
        const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
          email: userData.email,
          email_confirm: true,
          user_metadata: {
            username: userData.username,
            role: userData.role
          }
        })

        if (authError) throw authError

        // Then create the user profile in the users table
        const { data: profileData, error: profileError } = await supabaseClient
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email: userData.email,
              username: userData.username,
              role: userData.role,
              status: 'active'
            }
          ])
          .select()
          .single()

        if (profileError) throw profileError

        return new Response(JSON.stringify({ data: profileData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'updateUser':
        const { data: updatedUser, error: updateError } = await supabaseClient
          .from('users')
          .update(userData)
          .eq('id', userId)
          .select()
          .single()

        if (updateError) throw updateError
        return new Response(JSON.stringify({ data: updatedUser }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'deleteUser':
        // First delete the auth user
        const { error: deleteAuthError } = await supabaseClient.auth.admin.deleteUser(userId)
        if (deleteAuthError) throw deleteAuthError

        // Then delete the user profile
        const { error: deleteProfileError } = await supabaseClient
          .from('users')
          .delete()
          .eq('id', userId)

        if (deleteProfileError) throw deleteProfileError
        return new Response(JSON.stringify({ data: { success: true } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      case 'toggleUserStatus':
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
        const { data: toggledUser, error: toggleError } = await supabaseClient
          .from('users')
          .update({ status: newStatus })
          .eq('id', userId)
          .select()
          .single()

        if (toggleError) throw toggleError
        return new Response(JSON.stringify({ data: toggledUser }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

      default:
        throw new Error(`Unknown action: ${action}`)
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
}) 