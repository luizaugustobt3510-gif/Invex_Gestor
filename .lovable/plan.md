## Objetivo

Reformular o controle de acesso para que:

1. **Cada usuário tem 1 role principal + módulos extras concedidos**. Se a empresa concedeu um módulo a ele (via `user_module_permissions.is_active = true`), ele tem CRUD completo naquele módulo, mesmo que seu role principal seja outro.
2. **Admin Empresa = gerência apenas**. Ele administra empresa, usuários, módulos, planos, setores e configurações. Para operar em RH/Financeiro/Logística/etc., precisa do role correspondente OU de módulo concedido — igual a qualquer outro usuário.
3. **Isolamento total entre empresas** continua via `is_company_member` em todas as RLS.

## Mudanças no Banco

### 1. Nova função helper

```sql
public.user_can_write_module(_user_id uuid, _company_id uuid, _module_key text) returns boolean
```

Retorna `true` se:
- é `super_admin`, OU
- é membro da empresa E (tem o role principal do módulo OU tem `user_module_permissions(is_active=true)` para esse módulo)
- E o módulo está ativo na empresa (`company_modules.is_active = true`)

Mapeamento role→módulo:
- `logistica` → logistica; `usuario_almox`, `solicitante` → logistica
- `rh`, `visualizador` → rh
- `financeiro` → financeiro
- `manutencao` → manutencao
- `vendas` → vendas (se existir)

### 2. Refatorar RLS (INSERT/UPDATE/DELETE) das tabelas operacionais

Substituir padrão atual:
```
is_company_admin(uid, company_id) OR (is_company_member(...) AND has_role(uid, 'X'))
```
Por:
```
user_can_write_module(uid, company_id, '<modulo>')
```

Tabelas afetadas (separadas por módulo):

```text
RH (gestão de pessoas):
  employees, employee_asos, employee_certificates, employee_occurrences,
  employee_terminations, employee_trainings, employee_vacations,
  benefits, benefits_monthly, employee_benefits, development_plans

Financeiro:
  financial_entries, financial_categories

Logística:
  materials, movements, sectors, suppliers, purchase_orders, purchase_order_items,
  requests, request_items, conciliacao_log, contagem_fisica, curva_abc_data

Manutenção:
  maintenance_records, maintenance_attachments, maintenance_history,
  maintenance_service_orders

Academia:
  academy_students, academy_payments

Vendas:
  sales, sale_items (se existirem)
```

SELECT continua com `is_company_member` (todo mundo da empresa lê — UI faz o gating de exibição).

### 3. Manter `is_company_admin` apenas nas tabelas de gestão

```text
companies, user_roles, company_modules, company_plans, user_module_permissions,
audit_log, system_config (se houver)
```

Admin Empresa NÃO ganha mais CRUD automático em RH/Financeiro/etc.

### 4. Garantir isolamento entre empresas

- Reforçar que toda política tem `is_company_member(uid, company_id)` no `USING`/`WITH CHECK`.
- `super_admin` continua com bypass via política `ALL`.

## Mudanças no Frontend

### 1. `useModuleAccess` hook
Atualizar para considerar módulo concedido como "pode escrever". Hoje provavelmente esconde botões com base só em role; passar a usar `hasModuleAccess(moduleKey)` para liberar ações.

### 2. Sidebar (`AppSidebar.tsx`)
Já filtra por `moduleKey`. Garantir que itens aparecem se o usuário tem o módulo concedido, independente do role.

### 3. Telas de criar/editar
Remover checks tipo `if (role !== 'rh') return null` e substituir por `if (!canAccessModule('rh')) return null`.

### 4. Gestão de Usuários (`GestaoUsuarios.tsx`)
- Admin Empresa só vê/edita usuários da própria empresa (já é assim via RLS).
- UI deixa claro: "Role principal" + "Módulos extras concedidos" (checkboxes).
- Ao marcar módulo extra, escreve em `user_module_permissions(is_active=true)`.

## O que NÃO muda

- Estrutura de tabelas (sem ALTER TABLE em colunas existentes).
- Fluxos de Logística/Estoque (regra do projeto: não quebrar).
- Super admin e isolamento por `company_id`.
- Login, signup, reset de senha.

## Riscos & Validação

- **Risco principal**: Admin Empresa que hoje opera em RH/Financeiro perde acesso. Mitigação: documentar e, se necessário, conceder os módulos a ele via `user_module_permissions` na própria migração para os admins existentes.
- Vou rodar a migração primeiro e pedir sua confirmação antes de mexer no frontend.

## Próximo passo

Crio a migração SQL e te apresento para aprovar. Depois ajusto frontend (`useModuleAccess`, telas de gestão de usuários, gates de UI).
