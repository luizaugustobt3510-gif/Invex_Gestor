import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { email, password, nome, company_name, company_cnpj } = body;

    if (!email || !password || !nome || !company_name) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos. Informe email, password, nome e company_name." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any company exists - this is only for initial setup
    const { count } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true });

    if (count && count > 0) {
      // If companies exist, require auth - only super_admin can create users
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Não autorizado. Setup inicial já foi realizado." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user: callerUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !callerUser) {
        return new Response(
          JSON.stringify({ error: "Token inválido." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if caller is super_admin or admin_empresa
      const { data: callerRole } = await supabase
        .from("user_roles")
        .select("role, company_id")
        .eq("user_id", callerUser.id)
        .single();

      if (!callerRole || (callerRole.role !== "super_admin" && callerRole.role !== "admin_empresa")) {
        return new Response(
          JSON.stringify({ error: "Sem permissão para criar usuários." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use caller's company_id
      const companyId = callerRole.company_id;
      const role = body.role || "solicitante";

      // Create auth user
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update profile with company_id
      await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("user_id", authData.user.id);

      // Create role
      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role,
        company_id: companyId,
      });

      return new Response(
        JSON.stringify({ ok: true, msg: `Usuário ${email} criado com sucesso.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initial setup: create company + super_admin
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: company_name, cnpj: company_cnpj || null })
      .select("id")
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar empresa: " + (companyError?.message || "desconhecido") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user
    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (createError) {
      // Rollback company
      await supabase.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update profile with company_id
    await supabase
      .from("profiles")
      .update({ company_id: company.id })
      .eq("user_id", authData.user.id);

    // Create super_admin role
    await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      role: "super_admin",
      company_id: company.id,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        msg: `Setup completo! Empresa "${company_name}" e administrador ${email} criados.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
