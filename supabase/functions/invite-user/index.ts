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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado." }, 401);
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return json({ error: "Token inválido." }, 401);

    const { data: callerRole } = await supabase
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!callerRole || (callerRole.role !== "super_admin" && callerRole.role !== "admin_empresa")) {
      return json({ error: "Sem permissão para convidar usuários." }, 403);
    }

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const nome = String(body.nome || "").trim();
    const role = String(body.role || "solicitante");
    const cargo = body.cargo ? String(body.cargo).trim() : null;
    const requestedCompanyId = typeof body.company_id === "string" ? body.company_id : null;
    const redirectTo = String(body.redirect_to || "");

    if (!email || !nome) return json({ error: "Informe nome e e-mail." }, 400);

    const companyId = callerRole.role === "super_admin"
      ? (requestedCompanyId || callerRole.company_id)
      : callerRole.company_id;
    if (!companyId) return json({ error: "Empresa não identificada." }, 400);

    // Check if user already exists
    const { data: listRes } = await supabase.auth.admin.listUsers();
    const existing = listRes?.users?.find((u) => u.email?.toLowerCase() === email);
    if (existing) {
      return json({ error: "Já existe um usuário com este e-mail." }, 400);
    }

    // Send invite (Supabase creates the auth.user in "invited" state and emails link)
    const { data: invited, error: inviteErr } = await supabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
      data: { nome, invited_by: caller.id },
    });

    if (inviteErr || !invited?.user) {
      return json({ error: inviteErr?.message || "Falha ao enviar convite." }, 400);
    }

    // handle_new_user trigger already created the profile row. Update with company + invite meta.
    const inviteToken = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await supabase.from("profiles").upsert({
      user_id: invited.user.id,
      email,
      nome,
      company_id: companyId,
      cargo,
      invite_token: inviteToken,
      invite_expires_at: expires,
      invited_at: new Date().toISOString(),
      created_by: caller.id,
      provider: "email",
      email_verified: false,
    }, { onConflict: "user_id" });

    // Insert role
    await supabase.from("user_roles").upsert({
      user_id: invited.user.id,
      role,
      company_id: companyId,
    }, { onConflict: "user_id,role" });

    return json({ ok: true, msg: `Convite enviado para ${email}.` });
  } catch (err) {
    return json({ error: "Erro interno: " + (err as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
