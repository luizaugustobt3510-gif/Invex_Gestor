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

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify super_admin
    const { data: isSuperAdmin } = await adminClient.rpc('is_super_admin', { _user_id: user.id });
    if (!isSuperAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado. Apenas super_admin pode deletar empresas.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: 'company_id é obrigatório.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get company name for logging
    const { data: company } = await adminClient.from('companies').select('name').eq('id', company_id).single();
    if (!company) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada.' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Delete all related data in order (respecting foreign keys)
    const tablesToDelete = [
      // Financial
      'financial_entries',
      'financial_categories',
      // Sales
      'sale_items',
      'sales',
      // Academy
      'academy_payments',
      'academy_students',
      // HR
      'development_plans',
      'employee_trainings',
      'employee_asos',
      'employee_certificates',
      'employee_occurrences',
      'employee_terminations',
      'employee_vacations',
      'performance_evaluations',
      'time_records',
      'trainings',
      'termination_reasons',
      // Logistics
      'stock_movements',
      'purchase_order_items',
      'purchase_orders',
      'material_requests',
      'conciliacao_log',
      'contagem_fisica',
      'movimentacoes_importadas',
      'saldo_sistema_importado',
      'temperature_records',
      'materials',
      'sectors',
      // Config
      'user_module_permissions',
      'company_modules',
      'company_plans',
      // Employees
      'employees',
    ];

    for (const table of tablesToDelete) {
      const { error } = await adminClient.from(table).delete().eq('company_id', company_id);
      if (error) {
        console.warn(`Warning deleting from ${table}:`, error.message);
      }
    }

    // Delete user_roles and profiles for users of this company
    const { data: companyUsers } = await adminClient
      .from('user_roles')
      .select('user_id')
      .eq('company_id', company_id);

    if (companyUsers && companyUsers.length > 0) {
      const userIds = companyUsers.map(u => u.user_id);
      
      // Delete user_roles
      await adminClient.from('user_roles').delete().eq('company_id', company_id);
      
      // Delete profiles
      for (const uid of userIds) {
        await adminClient.from('profiles').delete().eq('user_id', uid);
      }

      // Delete auth users
      for (const uid of userIds) {
        try {
          await adminClient.auth.admin.deleteUser(uid);
        } catch (e) {
          console.warn(`Warning deleting auth user ${uid}:`, e);
        }
      }
    }

    // Delete audit_log entries
    await adminClient.from('audit_log').delete().eq('entity_type', 'company').eq('entity_id', company_id);

    // Finally, delete the company
    const { error: companyError } = await adminClient.from('companies').delete().eq('id', company_id);
    if (companyError) {
      return new Response(JSON.stringify({ error: `Erro ao deletar empresa: ${companyError.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Company "${company.name}" (${company_id}) deleted by ${user.email}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Empresa "${company.name}" e todos os dados foram removidos.`,
      deletedBy: user.email,
      timestamp: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('Delete company error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
