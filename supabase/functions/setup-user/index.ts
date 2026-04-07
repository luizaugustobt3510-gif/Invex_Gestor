import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PROTECTED_EMAIL = "luiz@invex.com";

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
    const { action } = body;

    // ==================== AUTO SETUP MASTER ====================
    if (action === "auto_setup_master") {
      // Check if any company exists
      const { count } = await supabase
        .from("companies")
        .select("id", { count: "exact", head: true });

      if (count && count > 0) {
        return new Response(
          JSON.stringify({ ok: false, msg: "Setup já foi realizado." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if user already exists in auth
      const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.find(u => u.email?.toLowerCase() === PROTECTED_EMAIL);

      if (userExists) {
        // User exists but no company - create company and link
        const { data: company, error: companyError } = await supabase
          .from("companies")
          .insert({ name: "MASTER", cnpj: "00.000.000/0001-00" })
          .select("id")
          .single();

        if (companyError || !company) {
          return new Response(
            JSON.stringify({ error: "Erro ao criar empresa MASTER." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await supabase.from("profiles").update({ company_id: company.id }).eq("user_id", userExists.id);
        
        // Check if role exists
        const { data: existingRole } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", userExists.id)
          .single();

        if (!existingRole) {
          await supabase.from("user_roles").insert({
            user_id: userExists.id,
            role: "super_admin",
            company_id: company.id,
          });
        } else {
          await supabase.from("user_roles").update({ company_id: company.id, role: "super_admin" }).eq("user_id", userExists.id);
        }

        return new Response(
          JSON.stringify({ ok: true, msg: "Setup MASTER concluído." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create company MASTER
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({ name: "MASTER", cnpj: "00.000.000/0001-00" })
        .select("id")
        .single();

      if (companyError || !company) {
        return new Response(
          JSON.stringify({ error: "Erro ao criar empresa MASTER." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create auth user
      const { data: authData, error: createError } = await supabase.auth.admin.createUser({
        email: PROTECTED_EMAIL,
        password: "353510",
        email_confirm: true,
        user_metadata: { nome: "Luiz - Admin Master" },
      });

      if (createError) {
        await supabase.from("companies").delete().eq("id", company.id);
        return new Response(
          JSON.stringify({ error: "Erro ao criar usuário: " + createError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("profiles").update({ company_id: company.id }).eq("user_id", authData.user.id);

      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "super_admin",
        company_id: company.id,
      });

      return new Response(
        JSON.stringify({ ok: true, msg: "Setup MASTER concluído com sucesso!" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== DELETE USER ACTION ====================
    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) {
        return new Response(
          JSON.stringify({ error: "user_id é obrigatório." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Require auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Não autorizado." }),
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

      // Check caller is super_admin or admin_empresa
      const { data: callerRole } = await supabase
        .from("user_roles")
        .select("role, company_id")
        .eq("user_id", callerUser.id)
        .single();

      if (!callerRole || (callerRole.role !== "super_admin" && callerRole.role !== "admin_empresa")) {
        return new Response(
          JSON.stringify({ error: "Sem permissão para deletar usuários." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Prevent self-deletion
      if (user_id === callerUser.id) {
        return new Response(
          JSON.stringify({ error: "Não é possível deletar a si mesmo." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Cross-company check for admin_empresa
      if (callerRole.role === "admin_empresa") {
        const { data: targetRole } = await supabase
          .from("user_roles")
          .select("company_id, role")
          .eq("user_id", user_id)
          .single();

        if (!targetRole || targetRole.company_id !== callerRole.company_id) {
          return new Response(
            JSON.stringify({ error: "Sem permissão para deletar usuário de outra empresa." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (targetRole.role === "admin_empresa" || targetRole.role === "super_admin") {
          return new Response(
            JSON.stringify({ error: "Admins não podem remover outros admins." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // PROTECT MASTER ADMIN - cannot be deleted
      const { data: { user: targetUser } } = await supabase.auth.admin.getUserById(user_id);
      if (targetUser?.email?.toLowerCase() === PROTECTED_EMAIL) {
        return new Response(
          JSON.stringify({ error: "Esta conta é protegida e não pode ser deletada." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete from user_roles and profiles first
      await supabase.from("user_roles").delete().eq("user_id", user_id);
      await supabase.from("profiles").delete().eq("user_id", user_id);

      // Delete from auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: "Erro ao deletar usuário do auth: " + deleteError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, msg: "Usuário deletado completamente." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== BULK DELETE ACTION ====================
    if (action === "bulk_delete_except") {
      const { keep_email } = body;
      if (!keep_email) {
        return new Response(
          JSON.stringify({ error: "keep_email é obrigatório." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Require auth
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ error: "Não autorizado." }),
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

      // Only super_admin can bulk delete
      const { data: callerRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerUser.id)
        .single();

      if (!callerRole || callerRole.role !== "super_admin") {
        return new Response(
          JSON.stringify({ error: "Apenas super_admin pode executar esta ação." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // List all auth users
      const { data: { users: allUsers } } = await supabase.auth.admin.listUsers();
      // Always protect the master admin
      const toDelete = (allUsers || []).filter(u => {
        const email = u.email?.toLowerCase();
        return email !== keep_email.toLowerCase() && email !== PROTECTED_EMAIL;
      });

      let deleted = 0;
      for (const u of toDelete) {
        await supabase.from("user_roles").delete().eq("user_id", u.id);
        await supabase.from("profiles").delete().eq("user_id", u.id);
        await supabase.auth.admin.deleteUser(u.id);
        deleted++;
      }

      return new Response(
        JSON.stringify({ ok: true, msg: `${deleted} usuário(s) deletado(s). Mantido: ${keep_email}` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==================== CREATE USER ACTION (default) ====================
    const { email, password, nome, company_name, company_cnpj } = body;

    if (!email || !password || !nome) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos. Informe email, password e nome." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if any company exists - this is only for initial setup
    const { count } = await supabase
      .from("companies")
      .select("id", { count: "exact", head: true });

    if (count && count > 0) {
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

      const requestedCompanyId = typeof body.company_id === "string" ? body.company_id : null;
      const companyId = callerRole.role === "super_admin" ? (requestedCompanyId || callerRole.company_id) : callerRole.company_id;
      const role = body.role || "solicitante";

      // Check if user already exists
      const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
      const userExists = existingUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase());
      
      if (userExists) {
        return new Response(
          JSON.stringify({ error: "Um usuário com este e-mail já está cadastrado." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

      await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("user_id", authData.user.id);

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

    // Initial setup (legacy path)
    if (!company_name || !company_cnpj) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos para setup inicial. Informe company_name e company_cnpj." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({ name: company_name, cnpj: company_cnpj })
      .select("id")
      .single();

    if (companyError || !company) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar empresa: " + (companyError?.message || "desconhecido") }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { users: existingSetupUsers } } = await supabase.auth.admin.listUsers();
    const setupUserExists = existingSetupUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (setupUserExists) {
      await supabase.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: "Um usuário com este e-mail já está cadastrado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: authData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome },
    });

    if (createError) {
      await supabase.from("companies").delete().eq("id", company.id);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase
      .from("profiles")
      .update({ company_id: company.id })
      .eq("user_id", authData.user.id);

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
