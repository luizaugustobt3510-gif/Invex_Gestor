
## Diagnóstico da arquitetura atual

Já existe base sólida no sistema — o plano preserva tudo:

- **`material_requests`** — enfermagem pede materiais ao almoxarifado (setor, código, quantidade, status). Aprovação atual em `ListarSolicitacoes.handleDeliver` já deduz `materials.quantidade` e grava `stock_movements` (tipo `saida`).
- **`material_dispensations`** — hoje usada para dois modos (interna e paciente), com campos `patient_id`, `exam_type`, `valor_unitario`, `billing_status`. **Problema:** o modo Paciente NÃO gera `stock_movements` nem deduz estoque, e o modo Interna duplica a saída se a mesma quantidade já veio via solicitação aprovada.
- **`stock_movements`** — log central de saídas/entradas. Falta rastro do que foi consumido em paciente.
- **Faturamento** — já lê `material_dispensations` agrupado por paciente/exame. Precisa continuar funcionando.

O gap real é: **não há distinção entre "material entregue ao setor" e "material consumido no atendimento"**. Sem isso, não há custo por atendimento nem estoque de setor confiável.

## Modelo proposto — 3 estágios, uma tabela nova

```text
[ Almoxarifado central ]
      │ (materials.quantidade)
      │
      ▼  1) Solicitação
material_requests (enfermagem pede) ──► aprovação
      │
      ▼  2) Entrega ao setor  (stock_movements: 'transferencia')
sector_stock (saldo por setor + material)  ◄── novo
      │
      ▼  3) Consumo assistencial  (stock_movements: 'consumo')
patient_consumptions (paciente + atendimento + profissional + material)  ◄── novo
      │
      ▼
material_dispensations (faturamento — gerado automaticamente do consumo)
```

Regras:
- Estoque central só é debitado UMA vez, na entrega ao setor.
- Setor recebe saldo próprio; enfermagem só consome do que o setor tem.
- Consumo no paciente debita o setor e cria o registro clínico + faturável.
- Todo estágio gera linha em `stock_movements` (mantém histórico único e auditável).

## Mudanças de banco (uma migração)

1. **`sector_stock`** — saldo por (`company_id`, `sector_id`, `material_id`), com `quantidade`, `updated_at`. Único por trio. RLS: leitura/escrita para membros da empresa; escrita restrita via `user_can_write_module('logistica')` OR papéis clínicos para `UPDATE` no consumo.
2. **`patient_consumptions`** — `company_id`, `patient_id`, `evolution_id` (nullable, FK opcional para `clinical_evolutions`), `appointment_id` (nullable, FK para `clinic_appointments`), `professional_user_id`, `material_id`, `sector_id`, `quantidade`, `valor_unitario`, `exam_type`, `observacoes`, `dispensation_id` (nullable — link para linha faturável gerada). RLS: papéis clínicos da empresa; leitura ampla para faturamento/logística.
3. **`stock_movements.tipo`** — passa a aceitar `transferencia` e `consumo` além de `entrada`/`saida`. Adicionar colunas opcionais `sector_id`, `patient_consumption_id` e `request_id` para rastro.
4. **Trigger `apply_patient_consumption`** — em INSERT de `patient_consumptions`: valida saldo em `sector_stock`, debita, grava `stock_movements` tipo `consumo`, e insere linha em `material_dispensations` com `destino_tipo='paciente'`, preenchendo `patient_id`, `exam_type`, `valor_*`, `billing_status='pendente'`, e devolve `dispensation_id` no registro. Estorno em DELETE.
5. **Trigger `apply_sector_delivery`** — refatora `handleDeliver` para chamar RPC `deliver_material_request(request_id)` que: debita `materials`, credita `sector_stock`, grava `stock_movements` tipo `transferencia` com `sector_id` e `request_id`, marca request como `Entregue`. Substitui a lógica hoje inline no client.
6. GRANTs completos + RLS + trigger `update_updated_at_column` nas novas tabelas.

## Mudanças de frontend

- **`src/services/logisticaService.ts`** — adicionar `getSectorStock`, `deliverRequest(requestId)` (chama RPC), `getPatientConsumptions`.
- **`src/pages/ListarSolicitacoes.tsx`** — `handleDeliver` passa a chamar `deliverRequest` RPC (remove deduc manual + insert de stock_movements). Mostra setor de destino como confirmação.
- **`src/pages/Dispensacao.tsx`** — refatorar:
  - Modo **Interna** (logística): mantém — é a entrega avulsa ao setor, também via RPC de transferência (não mais insert direto em `material_dispensations`).
  - Modo **Paciente** (enfermagem): passa a gravar em `patient_consumptions` (não mais direto em `material_dispensations`). O trigger cria a linha faturável automaticamente. Seletor de materiais lista o `sector_stock` do setor do usuário (ou setor escolhido), não o estoque central — enfermagem só vê o que tem no setor.
  - Adicionar campo "Atendimento" (link opcional a `clinical_evolutions` ou `clinic_appointments` recentes do paciente).
- **`src/pages/clinica/Evolucao.tsx`** — no cadastro de evolução, aba/seção "Materiais utilizados" que insere `patient_consumptions` com `evolution_id` preenchido. Reaproveita `sector_stock` do setor do profissional.
- **Novo `src/pages/logistica/EstoqueSetores.tsx`** — visão do saldo por setor (leitura), com filtro por setor/material e histórico de transferências. Rota `/logistica/estoque-setores` protegida por módulo `logistica`.
- **`src/config/modules.ts`** — adicionar submódulo `logistica.estoque_setores` e `clinica.consumo_assistencial`. Sem quebrar módulos existentes.
- **`src/pages/Faturamento.tsx`** — nenhuma mudança de contrato; continua lendo `material_dispensations`. Passa a exibir opcionalmente o `evolution_id`/`appointment_id` via join com `patient_consumptions` quando existir.

## Compatibilidade e migração de dados

- Dispensações antigas em `material_dispensations` continuam válidas e visíveis no faturamento (leitura).
- `sector_stock` inicia vazio; entregas futuras o populam. Opcionalmente, script único (executado sob demanda) para inicializar saldos com base em requests já `Entregue`.
- Nenhum papel perde permissão. Papéis clínicos ganham acesso de leitura ao `sector_stock` do próprio setor via `user_can_write_module` estendido para `dispensacao`/`clinica`.

## Detalhes técnicos (para revisão do dev)

- RPCs `SECURITY DEFINER` com `search_path=public`, validando `is_company_member` e o módulo correspondente.
- Validação de saldo em trigger `BEFORE INSERT` para retornar erro amigável antes de qualquer mutação.
- Índices: `sector_stock(company_id, sector_id, material_id)` UNIQUE; `patient_consumptions(company_id, patient_id, created_at DESC)`; `stock_movements(company_id, sector_id, created_at DESC)`.
- `material_dispensations` recebe coluna `patient_consumption_id` (FK, nullable) para amarrar novo modelo ao legado sem quebrar leitura atual.

## Ordem de entrega

1. Migração de schema + RPCs + triggers + GRANTs/RLS.
2. Ajuste de `ListarSolicitacoes` e `logisticaService` para usar RPC de entrega.
3. Refactor de `Dispensacao.tsx` (modo Paciente → `patient_consumptions`; modo Interna → RPC de transferência).
4. Nova página `EstoqueSetores` + submódulos no catálogo.
5. Integração de "Materiais utilizados" na `Evolucao.tsx`.
6. Validação end-to-end: solicitar → aprovar → conferir saldo do setor → consumir no paciente → conferir dispensação no faturamento e movimentação em `stock_movements`.
