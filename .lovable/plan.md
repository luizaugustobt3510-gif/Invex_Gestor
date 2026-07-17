## Escopo

Quatro frentes, todas aditivas — nenhum fluxo existente de Logística/Estoque/Vendas é alterado.

### 1. Dispensação — separar em 2 submódulos

- `dispensacao.interna` — Logística registra saída de material para **um setor destinatário** (não paciente).
- `dispensacao.paciente` — Enfermagem/Clínica registra material usado para **paciente + atendimento** (fluxo atual).
- Nova coluna `material_dispensations.destino_tipo` ('paciente' | 'setor') + `destino_sector_id`.
- Página `Dispensacao.tsx` passa a rotear em duas telas: `DispensacaoInterna` e `DispensacaoPaciente`. Sidebar mostra só as que o usuário tem permissão (via useModuleAccess submódulos).
- Registro segue sem alterar saldo de estoque (mantido).

### 2. Integração de estoque entre setores (grants)

- Nova tabela `stock_access_grants` (company_id, from_sector_id, to_user_id, can_read, can_write, granted_by).
- Só `super_admin`/`admin_empresa` da mesma empresa concede/revoga (RLS por `is_company_admin` + `company_id`).
- Nova página **"Integração de Setores"** em Gestão de Módulos × Usuários: admin escolhe usuário destino + setor de origem + read/write.
- `logisticaService.getMaterials` ganha versão `getMaterialsAuthorized(userId, companyId)` que filtra por grants + role. Usada por Dispensação Interna e por Vendas (visualização de itens sem permissão de escrita quando não é do próprio setor). Fluxos existentes de logística seguem inalterados.

### 3. Assinaturas por setor

- Adicionar `user_signatures.sector_id` (nullable) — assinatura pertence a 1 setor.
- Sidebar: novo grupo "Assinaturas" com submódulos dinâmicos `assinaturas.<sector_slug>` gerados a partir de `sectors` da empresa.
- Regras:
  - Cada usuário sempre gere a **sua própria** assinatura (independente de submódulo).
  - Ver as assinaturas de um setor requer o submódulo `assinaturas.<setor>`.
  - Admin da empresa vê todas.
- Página `Assinaturas.tsx` atualizada: seleção de setor no cadastro; lista filtrada por submódulos permitidos + próprias.

### 4. Anamnese — correção + assinaturas

- Bug: hoje `NovaAnamnese.tsx` monta responses vazio quando o template dinâmico não segue o esquema esperado — vou refazer a serialização para garantir shape `{question, answer}[]` compatível com a edge function e voltar a chamar `generate-anamnese-pdf` com payload validado.
- Integrar seleção de assinatura antes de "Gerar PDF": dropdown com assinaturas do usuário + botão "Assinar agora" (SignaturePad) + opção "Usar assinatura padrão automaticamente" (default = padrão do usuário se existir).
- Assinatura escolhida é enviada à edge function e desenhada no rodapé do PDF (novo parâmetro `signature_image_url` opcional).

### 5. Módulo Faturamento (novo)

- Novo módulo `faturamento` no catálogo.
- Nova coluna `materials.preco_unitario` (numeric, nullable) — usada só para faturamento; não afeta o estoque.
- Nova coluna `material_dispensations.valor_unitario`, `valor_total`, `billing_status` ('a_faturar' | 'faturado' | 'cancelado').
- Página `Faturamento.tsx`:
  - Lista de dispensações (paciente) com filtros: data (range), paciente, exame/atendimento (livre), material, setor, status.
  - Colunas: data, paciente, material, qtd, valor unit, total, status.
  - Ações: marcar como faturado / cancelado (admin_empresa + role `financeiro`).
  - Export Excel (via `excelUtils`) e resumo (total a faturar / faturado).
- RLS: `is_company_member` para leitura; escrita restrita a admin + financeiro.

## Detalhes técnicos

- Migrações Supabase:
  1. `ALTER material_dispensations ADD destino_tipo, destino_sector_id, valor_unitario, valor_total, billing_status, exam_type`.
  2. `ALTER user_signatures ADD sector_id`.
  3. `ALTER materials ADD preco_unitario`.
  4. `CREATE TABLE stock_access_grants` + GRANTs + RLS + policies.
  5. Novos módulos no catálogo → gerenciados por `MODULES_CATALOG` (`src/config/modules.ts`), submódulos gerados runtime para setores.
- Rotas novas: `/dispensacao/interna`, `/dispensacao/paciente`, `/faturamento`, `/gestao/integracao-setores`.
- `useModuleAccess` já suporta submódulos com composite key — adicionar tratamento para submódulos dinâmicos `assinaturas.<sector_id>` e `dispensacao.*`.
- Multi-tenant: todas as consultas continuam filtradas por `company_id` do usuário; grants incluem `company_id` e RLS impede cross-company.

## Não incluído

- Não altero fluxos de estoque, PO, requests ou vendas existentes.
- Faturamento não integra ainda com `financial_entries` (fica marcado como próxima fase).

Confirma para eu implementar tudo em sequência?