## Rodada 1 — Correções

### 1. Bug FK stock_movements ao dispensar
**Causa:** o trigger `apply_patient_consumption` é `BEFORE INSERT` em `patient_consumptions` e insere em `stock_movements` referenciando `NEW.id`. O FK `stock_movements_patient_consumption_fkey` não é `DEFERRABLE`, então o check acontece imediatamente e falha (linha-pai ainda não existe).
**Fix:** migração — `ALTER CONSTRAINT ... DEFERRABLE INITIALLY DEFERRED`.

### 2. Anamnese — cascata (múltiplas respostas ativam pergunta) + múltipla escolha
- Extender tipo `Question`:
  - novo campo `conditions?: { questionId: string; values: string[] }[]` (compat: mantém `condition.equals` legado).
  - novo `type: 'multi_escolha'` (array de opções, resposta serializada como JSON `["a","b"]`).
- `AnamneseModelos.tsx`: editor de condições com selects de pergunta-alvo + checkboxes das respostas possíveis. Editor de opções para `multi_escolha`.
- `NovaAnamnese.tsx`:
  - Avaliação: pergunta visível se todas as `conditions` casam (qualquer valor da lista bate) ou não há condições. Mantém compat com `condition.equals`.
  - Render `multi_escolha` como grid de toggles (sem auto-advance, botão "Continuar").
  - Serializa/deserializa como JSON.

### 3. Enquadramento
Anamnese: container `min-h-[calc(100dvh-...)]` com `flex-col`, área da pergunta com `flex-1 overflow-y-auto`, sticky footer com botões. Cabe em tela pequena com rolagem interna.

### 4. ADM deletar/editar pacientes e anamneses
- `Pacientes.tsx`: botões editar/excluir visíveis para `super_admin` / `admin_empresa`. Excluir → hardDeleteById('patients', id) com confirmação; bloqueia se houver anamneses/evoluções ligadas (mostra motivo).
- `PacienteProntuario.tsx` aba Anamneses: botão excluir para admins → `anamneses` + tentativa de remover PDF do storage.

### 5. Agrupar solicitações (1 pedido = 1 card com N itens)
- Migração: `ALTER TABLE material_requests ADD COLUMN request_group_id uuid` + índice.
- `SolicitarMaterial.tsx`: ao enviar o carrinho, gera 1 `request_group_id` (uuid client-side) aplicado a todos os itens do lote.
- `ListarSolicitacoes.tsx`: agrupa por `request_group_id` (fallback: solicitações antigas sem group_id continuam como cards individuais). Card do pedido mostra header (solicitante, setor, data, total de itens) e lista expansível. Ações "Aceitar tudo" / "Entregar tudo" iteram nos itens; ações por item continuam disponíveis.

### Arquivos afetados
- Migração SQL (FK deferrable + coluna request_group_id).
- `src/pages/clinica/AnamneseModelos.tsx`
- `src/pages/clinica/NovaAnamnese.tsx`
- `src/pages/clinica/Pacientes.tsx`
- `src/pages/clinica/PacienteProntuario.tsx`
- `src/pages/SolicitarMaterial.tsx`
- `src/pages/ListarSolicitacoes.tsx`

Rodada 2 (depois desta aprovar): novo módulo **Receituário** (simples/comum) com frases rápidas, PDF e histórico, integrado a paciente/anamnese.
