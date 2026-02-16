import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "npm:jspdf@2.5.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth client to validate user
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Service role client for storage uploads and DB writes
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's company and role
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role, company_id")
      .eq("user_id", userId)
      .single();

    if (!userRole || !userRole.company_id) {
      return new Response(
        JSON.stringify({ error: "Usuário sem empresa associada" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Role check: only super_admin and admin_empresa can generate
    if (
      userRole.role !== "super_admin" &&
      userRole.role !== "admin_empresa"
    ) {
      return new Response(
        JSON.stringify({ error: "Sem permissão para gerar Ordem de Compra" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();
    const { setor, fornecedor, cond_pagto, obs, itens } = body;

    if (!setor || !fornecedor || !cond_pagto || !itens || itens.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos para gerar OC" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get company info
    const { data: company } = await supabase
      .from("companies")
      .select("name, cnpj")
      .eq("id", userRole.company_id)
      .single();

    // Calculate total
    const total = itens.reduce(
      (sum: number, item: { quantidade: number; preco: number }) =>
        sum + Number(item.quantidade) * Number(item.preco),
      0
    );

    // Create purchase order record
    const { data: order, error: orderError } = await supabase
      .from("purchase_orders")
      .insert({
        company_id: userRole.company_id,
        user_id: userId,
        setor,
        fornecedor,
        cond_pagto,
        obs: obs || "",
        total,
        status: "pendente",
      })
      .select("id, created_at")
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar ordem de compra" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Insert order items
    const orderItems = itens.map(
      (item: {
        codigo: string;
        material: string;
        unidade: string;
        quantidade: number;
        preco: number;
      }) => ({
        purchase_order_id: order.id,
        company_id: userRole.company_id,
        codigo: item.codigo,
        material: item.material,
        unidade: item.unidade || "",
        quantidade: Number(item.quantidade),
        preco: Number(item.preco),
      })
    );

    await supabase.from("purchase_order_items").insert(orderItems);

    // Generate PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("ORDEM DE COMPRA", pageWidth / 2, y, { align: "center" });
    y += 12;

    // OC number and date
    const ocNumber = order.id.substring(0, 8).toUpperCase();
    const ocDate = new Date(order.created_at).toLocaleDateString("pt-BR");
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`OC Nº: ${ocNumber}`, margin, y);
    doc.text(`Data: ${ocDate}`, pageWidth - margin, y, { align: "right" });
    y += 8;

    // Divider
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    // Company info
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DA EMPRESA", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Razão Social: ${company?.name || "N/A"}`, margin, y);
    y += 5;
    doc.text(`CNPJ: ${company?.cnpj || "N/A"}`, margin, y);
    y += 10;

    // Supplier info
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("DADOS DO FORNECEDOR", margin, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Fornecedor: ${fornecedor}`, margin, y);
    y += 5;
    doc.text(`Setor Solicitante: ${setor}`, margin, y);
    y += 5;
    doc.text(`Condição de Pagamento: ${cond_pagto}`, margin, y);
    y += 10;

    // Items table header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("ITENS", margin, y);
    y += 6;

    // Table header
    const colX = [margin, margin + 20, margin + 85, margin + 110, margin + 130, margin + 155];
    doc.setFillColor(41, 65, 122);
    doc.rect(margin, y - 4, contentWidth, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Cód.", colX[0] + 1, y);
    doc.text("Material", colX[1] + 1, y);
    doc.text("Unid.", colX[2] + 1, y);
    doc.text("Qtd.", colX[3] + 1, y);
    doc.text("Preço Unit.", colX[4] + 1, y);
    doc.text("Total", colX[5] + 1, y);
    y += 6;

    // Table rows
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      const qty = Number(item.quantidade);
      const price = Number(item.preco);
      const itemTotal = qty * price;

      if (i % 2 === 0) {
        doc.setFillColor(240, 240, 245);
        doc.rect(margin, y - 4, contentWidth, 6, "F");
      }

      doc.text(String(item.codigo).substring(0, 10), colX[0] + 1, y);
      doc.text(String(item.material).substring(0, 35), colX[1] + 1, y);
      doc.text(String(item.unidade || "").substring(0, 10), colX[2] + 1, y);
      doc.text(String(qty), colX[3] + 1, y);
      doc.text(`R$ ${price.toFixed(2)}`, colX[4] + 1, y);
      doc.text(`R$ ${itemTotal.toFixed(2)}`, colX[5] + 1, y);
      y += 6;

      // Page break if needed
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    // Total
    y += 4;
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL GERAL: R$ ${total.toFixed(2)}`, pageWidth - margin, y, {
      align: "right",
    });
    y += 10;

    // Observations
    if (obs) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("OBSERVAÇÕES:", margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      const obsLines = doc.splitTextToSize(obs, contentWidth);
      doc.text(obsLines, margin, y);
    }

    // Convert to buffer
    const pdfBytes = doc.output("arraybuffer");
    const pdfBuffer = new Uint8Array(pdfBytes);

    // Upload to storage
    const filePath = `${userRole.company_id}/${order.id}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from("oc-pdfs")
      .upload(filePath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: "Erro ao salvar PDF: " + uploadError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get signed URL (valid for 1 hour)
    const { data: signedUrlData } = await supabase.storage
      .from("oc-pdfs")
      .createSignedUrl(filePath, 3600);

    const pdfUrl = signedUrlData?.signedUrl || "";

    // Update purchase order with pdf_url (store the path, not the signed URL)
    await supabase
      .from("purchase_orders")
      .update({ pdf_url: filePath })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        ok: true,
        msg: "Ordem de compra gerada com sucesso!",
        order_id: order.id,
        oc_number: ocNumber,
        pdf_url: pdfUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erro interno: " + (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
