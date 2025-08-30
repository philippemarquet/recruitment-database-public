import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

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
    // Create a Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    // Verify the user is authenticated
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Check if user is a manager
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (profileError || (profile?.role !== 'manager' && profile?.role !== 'hr_manager')) {
      throw new Error('Access denied: Only managers and HR managers can manage users')
    }

    const { action, userData } = await req.json()

    if (action === 'createUser') {
      // Create user with admin client
      const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
      })

      if (createError) {
        throw createError
      }

      // Create profile (handle case where trigger already created it)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          user_id: authUser.user.id,
          first_name: userData.first_name || null,
          last_name: userData.last_name || null,
          email: userData.email,
          phone: userData.phone || null,
          role: userData.role,
          recruiter_source: userData.role === 'externe_recruiter' ? userData.recruiter_source || null : null,
        }, {
          onConflict: 'user_id',
          ignoreDuplicates: false
        })

      if (profileError) {
        // Clean up auth user if profile creation fails
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
        throw profileError
      }

      return new Response(
        JSON.stringify({ success: true, user: authUser.user }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'deleteUser') {
      const { userId } = userData

      // Fetch profile to clean references before deleting auth user
      const { data: profileRow } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (profileRow?.id) {
        // Nullify references in related tables
        await supabaseAdmin
          .from('candidate_actions')
          .update({ assigned_to: null })
          .eq('assigned_to', profileRow.id)

        await supabaseAdmin
          .from('candidates')
          .update({ assigned_to: null })
          .eq('assigned_to', profileRow.id)

        // Remove profile row
        await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('user_id', userId)
      }

      // Delete auth user
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (deleteError) {
        throw deleteError
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})