import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify user with their token
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin client for checking role and performing reset
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify super_admin
    const { data: isSuperAdmin } = await adminClient.rpc('is_super_admin', { _user_id: user.id });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas super_admin pode resetar o sistema.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { company_id } = await req.json();

    // Get the company to reset
    const targetCompanyId = company_id || null;

    // Delete operational data in order (respecting foreign keys)
    // 1. stock_movements
    let query1 = adminClient.from('stock_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (targetCompanyId) query1 = adminClient.from('stock_movements').delete().eq('company_id', targetCompanyId);
    await query1;

    // 2. purchase_order_items
    if (targetCompanyId) {
      await adminClient.from('purchase_order_items').delete().eq('company_id', targetCompanyId);
    } else {
      await adminClient.from('purchase_order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // 3. purchase_orders
    if (targetCompanyId) {
      await adminClient.from('purchase_orders').delete().eq('company_id', targetCompanyId);
    } else {
      await adminClient.from('purchase_orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // 4. material_requests
    if (targetCompanyId) {
      await adminClient.from('material_requests').delete().eq('company_id', targetCompanyId);
    } else {
      await adminClient.from('material_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // 5. materials
    if (targetCompanyId) {
      await adminClient.from('materials').delete().eq('company_id', targetCompanyId);
    } else {
      await adminClient.from('materials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    // 6. sectors
    if (targetCompanyId) {
      await adminClient.from('sectors').delete().eq('company_id', targetCompanyId);
    } else {
      await adminClient.from('sectors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    console.log(`System reset executed by user ${user.id} (${user.email}) for company: ${targetCompanyId || 'ALL'}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Reset realizado com sucesso.',
      resetBy: user.email,
      timestamp: new Date().toISOString(),
      companyId: targetCompanyId || 'all',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Reset error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
