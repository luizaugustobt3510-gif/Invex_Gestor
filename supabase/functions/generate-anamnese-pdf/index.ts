import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";
import { Image as IsImage } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const MAX_PDF_BYTES = 1024 * 1024; // 1 MB
const SIG_MAX_WIDTH = 420; // px — suficiente para 60mm impressos
const SIG_MAX_BYTES = 120 * 1024; // orçamento por assinatura

const toDataUrl = (bytes: Uint8Array) => {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return `data:image/png;base64,${btoa(s)}`;
};

/** Redimensiona/otimiza a imagem da assinatura para reduzir o peso do PDF */
async function optimizeSignature(dataUrl: string): Promise<string> {
  try {
    const b64 = dataUrl.split(",")[1];
    if (!b64) return dataUrl;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    // Decodifica UMA única vez (decode/encode é a parte cara)
    const img = await IsImage.decode(bytes);
    if (img.width > SIG_MAX_WIDTH) img.resize(SIG_MAX_WIDTH, IsImage.RESIZE_AUTO);
    let out = await img.encode(6); // compressão equilibrada (bem mais rápida que 9)
    if (out.length > SIG_MAX_BYTES && img.width > 220) {
      img.resize(220, IsImage.RESIZE_AUTO);
      out = await img.encode(6);
    }
    const candidate = toDataUrl(out);
    return candidate.length < dataUrl.length ? candidate : dataUrl;
  } catch (_e) {
    return dataUrl;
  }
}

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
  anamnese_signature_image_url?: string;
  anamnese_signature_name?: string;
  anamnese_signature_credencial?: string;
  prescription?: { tipo?: string; content: string } | null;
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

    // Load ALL roles for the user and pick the best match (with a company_id preferred)
    const { data: allRoles } = await supabase
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", userId);

    const rolesList = (allRoles || []) as Array<{ role: string; company_id: string | null }>;
    const userRole =
      rolesList.find((r) => r.company_id) ||
      rolesList.find((r) => r.role === "super_admin") ||
      null;

    if (!userRole) return json({ error: "Usuário sem perfil atribuído" }, 403);
    const effectiveCompanyId = (userRole.company_id || "") as string;
    if (!effectiveCompanyId && userRole.role !== "super_admin") {
      return json({ error: "Usuário sem empresa" }, 403);
    }

    // Confirm module is active for company (skip for super_admin without company)
    if (effectiveCompanyId) {
      const { data: mod } = await supabase
        .from("company_modules")
        .select("is_active")
        .eq("company_id", effectiveCompanyId)
        .eq("module_key", "anamnese")
        .maybeSingle();
      if (!mod?.is_active) return json({ error: "Módulo Anamnese Digital não está ativo" }, 403);
    }

    const allowed = new Set([
      "super_admin", "admin_empresa", "clinica",
      "enfermagem", "enfermeiro", "recepcionista",
    ]);
    const hasAllowedRole = rolesList.some((r) => allowed.has(r.role));
    if (!hasAllowedRole) {
      return json({
        error: `Sem permissão para gerar anamnese (perfil: ${rolesList.map(r => r.role).join(", ") || "nenhum"})`,
      }, 403);
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
    if (!patient || patient.company_id !== effectiveCompanyId) {
      return json({ error: "Paciente inválido" }, 400);
    }

    // Consultas em paralelo (reduz latência)
    const [{ data: company }, { data: profile }] = await Promise.all([
      supabase.from("companies").select("name, cnpj").eq("id", effectiveCompanyId).single(),
      supabase.from("profiles").select("nome, email").eq("user_id", userId).maybeSingle(),
    ]);
    const createdByName = profile?.nome || profile?.email || "Usuário";

    // Insert anamnese record
    const { data: anamnese, error: insErr } = await supabase
      .from("anamneses")
      .insert({
        company_id: effectiveCompanyId,
        patient_id: patient.id,
        template_id: body.template_id || null,
        template_name: body.template_name || null,
        exam_type: body.exam_type,
        responses: body.responses,
        observations: body.observations || null,
        signature_image_url: body.signature_image_url || null,
        signature_source: body.signature_source || null,
        created_by: userId,
        created_by_name: createdByName,
      })
      .select("id, created_at")
      .single();
    if (insErr || !anamnese) return json({ error: "Falha ao registrar anamnese" }, 500);

    // Build PDF
    const doc = new jsPDF({ compress: true });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Paleta (cabeçalho em verde-petróleo)
    const HEADER: [number, number, number] = [16, 78, 71];
    const SECTION: [number, number, number] = [16, 78, 71];
    const ROW_ALT: [number, number, number] = [242, 247, 246];

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }
    };

    const anamneseNumber = anamnese.id.substring(0, 8).toUpperCase();
    const dt = new Date(anamnese.created_at);

    // Faixa de cabeçalho colorida
    doc.setFillColor(...HEADER);
    doc.rect(0, 0, pageWidth, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ANAMNESE DIGITAL", margin, 13);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text(`Nº ${anamneseNumber}`, margin, 20);
    doc.text(
      `${dt.toLocaleDateString("pt-BR")} ${dt.toLocaleTimeString("pt-BR").slice(0, 5)}`,
      pageWidth - margin,
      20,
      { align: "right" }
    );
    doc.setTextColor(0, 0, 0);
    y = 36;

    const sectionTitle = (label: string) => {
      ensureSpace(10);
      doc.setTextColor(...SECTION);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      y += 2;
      doc.setDrawColor(...SECTION);
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      doc.setLineWidth(0.2);
      doc.setTextColor(0, 0, 0);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
    };

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

    // Signature helper — reused on the anamnese page and on the prescription page
    const sigCache = new Map<string, string | null>();
    const loadSignature = async (url?: string): Promise<string | null> => {
      if (!url) return null;
      if (sigCache.has(url)) return sigCache.get(url)!;
      let out: string | null = null;
      try {
        if (url.startsWith("data:")) {
          out = await optimizeSignature(url);
        } else {
          const resp = await fetch(url);
          if (resp.ok) {
            const buf = new Uint8Array(await resp.arrayBuffer());
            let base64 = "";
            const chunk = 0x8000;
            for (let i = 0; i < buf.length; i += chunk) {
              base64 += String.fromCharCode(...buf.subarray(i, i + chunk));
            }
            out = await optimizeSignature(`data:image/png;base64,${btoa(base64)}`);
          }
        }
      } catch (_e) { out = null; }
      sigCache.set(url, out);
      return out;
    };

    const drawSignature = async (sig: { url?: string; name?: string; credencial?: string }) => {
      const dataUrl = await loadSignature(sig.url);
      if (!dataUrl) return;
      try {
        ensureSpace(50);
        y += 8;
        const sigW = 60, sigH = 25;
        const sigX = pageWidth - margin - sigW;
        doc.addImage(dataUrl, "PNG", sigX, y, sigW, sigH, undefined, "FAST");
        y += sigH + 2;
        doc.setDrawColor(120);
        doc.line(sigX, y, sigX + sigW, y);
        y += 4;
        doc.setFontSize(8);
        if (sig.name) doc.text(sig.name, sigX + sigW / 2, y, { align: "center" });
        if (sig.credencial) {
          y += 3.5;
          doc.text(sig.credencial, sigX + sigW / 2, y, { align: "center" });
        }
      } catch (_e) { /* ignore signature draw errors */ }
    };

    const rxSig = {
      url: body.signature_image_url,
      name: body.signature_name,
      credencial: body.signature_credencial,
    };
    // Quando há receita vinculada, a anamnese pode ter assinatura própria
    const anamSig = body.anamnese_signature_image_url
      ? {
          url: body.anamnese_signature_image_url,
          name: body.anamnese_signature_name,
          credencial: body.anamnese_signature_credencial,
        }
      : rxSig;

    // Assinatura da ANAMNESE (sempre na página da anamnese, antes da receita)
    await drawSignature(anamSig);

    // Receita vinculada (opcional) — mesma folha/PDF da anamnese
    const rxContent = body.prescription?.content?.trim();
    if (rxContent) {
      const tipoMap: Record<string, string> = {
        simples: "Receita Simples",
        especial: "Receita Especial",
        controlada: "Receita Controlada",
      };
      const tipoKey = body.prescription?.tipo || "simples";
      doc.addPage();
      y = 20;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("RECEITUÁRIO", pageWidth / 2, y, { align: "center" });
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(tipoMap[tipoKey] || tipoKey, pageWidth / 2, y, { align: "center" });
      y += 5;
      doc.setDrawColor(200);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      doc.setFontSize(9);
      doc.text(`Paciente: ${patient.nome}`, margin, y); y += 4;
      if (patient.cpf) { doc.text(`CPF: ${patient.cpf}`, margin, y); y += 4; }
      doc.text(`Data: ${dt.toLocaleDateString("pt-BR")}`, margin, y);
      y += 8;
      doc.setFontSize(10);
      const rxLines = doc.splitTextToSize(rxContent, contentWidth);
      for (const line of rxLines) {
        ensureSpace(6);
        doc.text(line, margin, y);
        y += 5;
      }
      y += 4;

      // Assinatura da receita
      await drawSignature(rxSig);

      // Persist prescription in the patient's record
      await supabase.from("prescriptions").insert({
        company_id: effectiveCompanyId,
        patient_id: patient.id,
        tipo: tipoKey,
        content: rxContent,
        observacoes: `Vinculada à anamnese Nº ${anamneseNumber}`,
        professional_name: body.signature_name || createdByName,
        professional_signature: null,
        created_by: userId,
        created_by_name: createdByName,
      });
    }


    // Footer / signature
    ensureSpace(24);
    y = Math.max(y + 6, pageHeight - 25);
    doc.setDrawColor(0);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Responsável: ${createdByName}`, margin, y);
    doc.text(`ID: ${anamneseNumber}`, pageWidth - margin, y, { align: "right" });

    const pdfBytes = doc.output("arraybuffer");
    const pdfBuffer = new Uint8Array(pdfBytes);
    if (pdfBuffer.length > MAX_PDF_BYTES) {
      console.warn(`PDF acima do limite de 1MB: ${(pdfBuffer.length / 1024).toFixed(0)}KB`);
    }
    const filePath = `${effectiveCompanyId}/${anamnese.id}.pdf`;
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
      pdf_size_kb: Math.round(pdfBuffer.length / 1024),
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
