import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnamneseInput {
  patient_id: string;
  template_id?: string | null;
  template_name?: string;
  exam_type: string;
  responses: { question: string; answer: string }[];
  observations?: string;
  signature_image_url?: string;
  signature_source?: string;
  signature_name?: string;
  signature_credencial?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Não autorizado" }, 401);
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Token inválido" }, 401);
    const userId = claimsData.claims.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", userId)
      .not("company_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (!userRole?.company_id) return json({ error: "Usuário sem empresa" }, 403);

    // Confirm module is active for company
    const { data: mod } = await supabase
      .from("company_modules")
      .select("is_active")
      .eq("company_id", userRole.company_id)
      .eq("module_key", "anamnese")
      .maybeSingle();
    if (!mod?.is_active) return json({ error: "Módulo Anamnese Digital não está ativo" }, 403);

    const allowed = ["super_admin", "admin_empresa", "clinica"];
    if (!allowed.includes(userRole.role)) {
      return json({ error: "Sem permissão para gerar anamnese" }, 403);
    }

    const body = (await req.json()) as AnamneseInput;
    if (!body.patient_id || !body.exam_type || !Array.isArray(body.responses)) {
      return json({ error: "Dados incompletos" }, 400);
    }

    // Load patient (must belong to same company)
    const { data: patient } = await supabase
      .from("patients")
      .select("id, company_id, nome, cpf, birth_date, phone, email, gender")
      .eq("id", body.patient_id)
      .maybeSingle();
    if (!patient || patient.company_id !== userRole.company_id) {
      return json({ error: "Paciente inválido" }, 400);
    }

    const { data: company } = await supabase
      .from("companies")
      .select("name, cnpj")
      .eq("id", userRole.company_id)
      .single();

    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, email")
      .eq("user_id", userId)
      .maybeSingle();
    const createdByName = profile?.nome || profile?.email || "Usuário";

    // Insert anamnese record
    const { data: anamnese, error: insErr } = await supabase
      .from("anamneses")
      .insert({
        company_id: userRole.company_id,
        patient_id: patient.id,
        template_id: body.template_id || null,
        template_name: body.template_name || null,
        exam_type: body.exam_type,
        responses: body.responses,
        observations: body.observations || null,
        created_by: userId,
        created_by_name: createdByName,
      })
      .select("id, created_at")
      .single();
    if (insErr || !anamnese) return json({ error: "Falha ao registrar anamnese" }, 500);

    // Build PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ANAMNESE DIGITAL", pageWidth / 2, y, { align: "center" });
    y += 10;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const anamneseNumber = anamnese.id.substring(0, 8).toUpperCase();
    const dt = new Date(anamnese.created_at);
    doc.text(`Nº ${anamneseNumber}`, margin, y);
    doc.text(
      `${dt.toLocaleDateString("pt-BR")} ${dt.toLocaleTimeString("pt-BR").slice(0, 5)}`,
      pageWidth - margin,
      y,
      { align: "right" }
    );
    y += 6;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Clinic
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CLÍNICA", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(company?.name || "-", margin, y);
    if (company?.cnpj) {
      y += 4;
      doc.text(`CNPJ: ${company.cnpj}`, margin, y);
    }
    y += 8;

    // Patient
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PACIENTE", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Nome: ${patient.nome}`, margin, y); y += 4;
    if (patient.cpf) { doc.text(`CPF: ${patient.cpf}`, margin, y); y += 4; }
    if (patient.birth_date) { doc.text(`Nascimento: ${new Date(patient.birth_date + "T00:00:00").toLocaleDateString("pt-BR")}`, margin, y); y += 4; }
    if (patient.gender) { doc.text(`Sexo: ${patient.gender}`, margin, y); y += 4; }
    if (patient.phone) { doc.text(`Telefone: ${patient.phone}`, margin, y); y += 4; }
    y += 4;

    // Exam
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("TIPO DE EXAME", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(body.exam_type, margin, y);
    if (body.template_name) { y += 4; doc.text(`Modelo: ${body.template_name}`, margin, y); }
    y += 8;

    // Q&A
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("PERGUNTAS E RESPOSTAS", margin, y);
    y += 6;

    doc.setFontSize(9);
    for (const r of body.responses) {
      const qLines = doc.splitTextToSize(`• ${r.question}`, contentWidth);
      const aText = r.answer && String(r.answer).trim().length ? String(r.answer) : "—";
      const aLines = doc.splitTextToSize(`   ${aText}`, contentWidth);
      ensureSpace((qLines.length + aLines.length) * 5 + 3);
      doc.setFont("helvetica", "bold");
      doc.text(qLines, margin, y);
      y += qLines.length * 5;
      doc.setFont("helvetica", "normal");
      doc.text(aLines, margin, y);
      y += aLines.length * 5 + 2;
    }

    if (body.observations) {
      y += 4;
      ensureSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("OBSERVAÇÕES", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const oLines = doc.splitTextToSize(body.observations, contentWidth);
      ensureSpace(oLines.length * 5);
      doc.text(oLines, margin, y);
      y += oLines.length * 5;
    }

    // Footer / signature
    ensureSpace(24);
    y += 10;
    doc.setDrawColor(0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Responsável: ${createdByName}`, margin, y);
    doc.text(`ID: ${anamneseNumber}`, pageWidth - margin, y, { align: "right" });

    const pdfBytes = doc.output("arraybuffer");
    const pdfBuffer = new Uint8Array(pdfBytes);
    const filePath = `${userRole.company_id}/${anamnese.id}.pdf`;
    const { error: upErr } = await supabase.storage
      .from("anamnese-pdfs")
      .upload(filePath, pdfBuffer, { contentType: "application/pdf", upsert: true });
    if (upErr) return json({ error: "Erro ao salvar PDF: " + upErr.message }, 500);

    await supabase.from("anamneses").update({ pdf_path: filePath }).eq("id", anamnese.id);

    const { data: signed } = await supabase.storage
      .from("anamnese-pdfs")
      .createSignedUrl(filePath, 3600);

    return json({
      ok: true,
      anamnese_id: anamnese.id,
      number: anamneseNumber,
      pdf_url: signed?.signedUrl || "",
    }, 200);
  } catch (err) {
    return json({ error: "Erro interno: " + (err as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
