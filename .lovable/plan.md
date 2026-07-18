# Plano de ajustes — Módulos, Dispensação, Assinaturas e Anamnese

## 1. Dispensação — separar Logística vs. Clínica
- **Logística nunca dispensa para paciente.** Remover a aba "Paciente" quando o usuário for de perfil logístico (`logistica`, `usuario_almox`, `solicitante`).
- Somente perfis clínicos (`clinica`, `enfermagem`, `enfermeiro`, `recepcionista`) veem/usam dispensação por paciente.
- **Múltiplos materiais por dispensação:** trocar seleção única por lista dinâmica de itens (material + quantidade), validando estoque de cada.

## 2. Setores como módulo
- Adicionar `setores` ao `MODULES_CATALOG` (rota permanece em Logística).
- Gate de acesso na Sidebar e rotas `/criar-setor` e `/listar-setores` via `useModuleAccess('setores')`.
- Toda seleção de setor (Dispensação, Assinaturas, Solicitações, etc.) usa `sectors` da empresa via um hook único `useSectors()`.

## 3. Conferência de Temperatura como módulo
- Adicionar `conferencia_temperatura` ao catálogo (categoria: Manutenção).
- Mover item de menu para junto de Manutenção na Sidebar.
- Ocultar card no Dashboard de Logística quando módulo desativado.

## 4. Dashboard — atalhos quando sem dashboard ativo
- Já existe `Shortcuts` em `Index.tsx`. Estender para incluir os novos módulos (Setores, Temperatura, Assinaturas, Dispensação, Faturamento) filtrados pelo `useModuleAccess`.

## 5. Assinaturas — respeitar módulo desativado
- Adicionar guard em `Assinaturas.tsx` e ocultar da Sidebar quando `assinaturas` estiver desativado para o usuário.

## 6. Componente universal de Assinatura em documentos
- Criar `<DocumentSignaturePicker />` com opções:
  1. **Sem assinatura**
  2. **Assinar agora** (pad)
  3. **Usar assinatura salva** (lista apenas as do usuário logado com direito)
  4. **Assinatura padrão da conta** (marcada como default)
- Usar em **Anamnese** e **Evolução Clínica**.

## 7. Anamnese — bugs
- **Bug do salto de pergunta condicional:** ao responder pergunta que abre filha, o auto-avanço está pulando a filha. Ajustar `handleAnswer` para reavaliar árvore antes de avançar índice.
- **Congelamento ao editar na revisão:** provavelmente estado imutável — trocar edição in-place para modal simples com Salvar.
- **Erro de permissão ao gerar PDF:** revisar edge function — a lista `allowed` já contém os novos perfis, mas storage bucket `anamnese-pdfs` pode não ter policy para eles. Revisar RLS de storage.
- **PDF com validade fiscal / documento profissional:** melhorar template do jsPDF (cabeçalho com marca da clínica, dados completos, rodapé com hash de integridade SHA-256 do conteúdo salvo no banco, número sequencial, data/hora com timezone, QR de verificação apontando para signed URL).

## 8. Evolução Clínica — assinatura cadastrada
- Integrar `<DocumentSignaturePicker />` para permitir selecionar assinatura já salva.

## Ordem de execução
1. Migração: catálogo de módulos (`setores`, `conferencia_temperatura`) — apenas seed em `company_modules` para empresas existentes; RLS de storage `anamnese-pdfs` revisada.
2. Frontend: catálogo `modules.ts` + Sidebar + rotas.
3. Componente `DocumentSignaturePicker` + hook `useSectors`.
4. Refactor Dispensação (múltiplos materiais + gate por perfil).
5. Refactor Anamnese (bugfixes + PDF profissional na edge function).
6. Refactor Evolução (usar picker).
7. Ajustes de guard em Assinaturas.

## Detalhes técnicos
- `useSectors(companyId)`: hook simples com cache local, usado em todos os selects de setor.
- `DocumentSignaturePicker` retorna `{ mode, dataUrl?, signatureId?, name?, credencial? }`.
- Múltiplos materiais em `material_dispensations`: hoje é 1 linha por material — criar N linhas por operação, agrupadas por `dispensation_group_id` (novo campo opcional) para faturamento poder agrupar. Alternativa mais barata: manter 1 linha por material e apresentar como grupo pelo `created_at`+`patient_id`+`created_by` no Faturamento. **Vou pela alternativa barata** para não migrar schema.
- PDF fiscal: jsPDF já usado; adicionar cabeçalho estruturado, seções com bordas, número sequencial por empresa (`anamnese_number` — novo campo INT), hash SHA-256 do JSON de respostas gravado em coluna `content_hash`, QR code apontando para URL de verificação pública `/verificar-anamnese/:id`.

Pergunta rápida antes de executar: **posso adicionar as colunas `anamnese_number` (sequencial por empresa) e `content_hash` na tabela `anamneses` para dar validade ao documento?** Se preferir sem migração, faço apenas com o UUID atual e hash calculado no PDF (não persistido). Responda "com migração" ou "sem migração" que eu sigo.
