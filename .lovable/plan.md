# Plano: Arquitetura Modular do Invex

## Princípio
Tudo é **aditivo**. Nenhuma tabela, rota, componente ou permissão atual é removida ou renomeada. O sistema hoje já tem base modular (`company_modules`, `user_module_permissions`, `useModuleAccess`, `GestaoModulos`). Vamos **estender**, não refazer.

## O que já existe (reaproveitar)
- `company_modules` — ativação de módulos por empresa
- `user_module_permissions` — permissão por usuário
- `useModuleAccess` + `RoleProtectedRoute` — gate de rotas
- `GestaoModulos.tsx` — tela de ativação
- Menu lateral (`AppSidebar`) já esconde itens sem acesso

## O que falta (o que este plano entrega)

### 1. Catálogo central de módulos (código)
Arquivo novo `src/config/modules.ts` — fonte única da verdade:
- id, label, descrição, ícone, rota principal, submódulos, roles padrão
- Substitui o array hardcoded em `GestaoModulos.tsx` e alimenta o sidebar
- Novos módulos previstos: `comercial`, `agenda`, `clinica`, `ordem_servico`, `scanner` (agrupador de QR/temp), `relatorios` (agrupador). Registrados como catálogo — telas placeholder só quando o usuário pedir.

### 2. Tipo de Empresa (template inicial)
- Nova coluna `companies.company_type` (text, default `'personalizado'`)
- Enum lógico em código: `comercial | clinica | industria | prestadora | distribuidora | personalizado`
- Novo arquivo `src/config/companyTypeTemplates.ts` mapeando tipo → módulos pré-ativos
- Aplicado **apenas na criação** da empresa (ou botão "aplicar template") — depois o admin edita livremente em `GestaoModulos`
- UI: campo select em `GestaoEmpresas` (criar/editar empresa)

### 3. Configurações por empresa
- Nova tabela `company_settings` (company_id PK, jsonb `settings`, timestamps) — armazena preferências gerais (tema, tipo, flags futuras) sem poluir `companies`
- RLS: leitura por membros da empresa, escrita por `is_company_admin`
- Não substitui `system_config` (global do super admin)

### 4. Sidebar dinâmico a partir do catálogo
- `AppSidebar` passa a iterar `MODULES_CATALOG` filtrando por `canAccessModule`
- Ordem e agrupamento vêm do catálogo
- Comportamento visual atual preservado (mesmo look, mesmos ícones existentes)

### 5. Dashboard adaptativo
- `DashboardEmpresa` já renderiza cards por módulo — vamos plugar o catálogo para esconder cards de módulos inativos automaticamente (hoje é manual/parcial)
- Nenhum card existente é removido; apenas condicionado a `canAccessModule(id)`

### 6. Tela "Módulos do Sistema" (admin da empresa)
- Nova rota `/configuracoes/modulos-empresa` — versão da `GestaoModulos` para o **admin da própria empresa** (não só super admin)
- Reusa componente atual, só muda o gate: `is_company_admin` sem precisar selecionar empresa
- Mostra também o Tipo de Empresa e botão "Aplicar template" (com confirmação: só ativa módulos do template que estejam desativados; nunca desativa nada)

### 7. Desativação = ocultar, nunca apagar
- Já é o comportamento atual (`is_active=false` só esconde). Vamos **documentar** no código com comentário no topo de `useModuleAccess` e adicionar teste manual na checklist.

## Banco de dados (migração única)

```text
ALTER TABLE companies ADD COLUMN company_type text NOT NULL DEFAULT 'personalizado';

CREATE TABLE company_settings (
  company_id uuid PK REFERENCES companies,
  settings jsonb NOT NULL DEFAULT '{}',
  created_at, updated_at
);
GRANT ... TO authenticated, service_role;
ENABLE RLS;
POLICY select: is_company_member
POLICY insert/update: is_company_admin
```

Nenhuma tabela existente é alterada de forma incompatível. `company_type` tem default → linhas antigas continuam válidas.

## Arquivos tocados

Novos:
- `src/config/modules.ts` (catálogo)
- `src/config/companyTypeTemplates.ts` (templates)
- `src/pages/ModulosEmpresa.tsx` (tela do admin)
- `supabase/migrations/*_modular_architecture.sql`

Editados (mínimo, aditivo):
- `src/components/AppSidebar.tsx` — ler catálogo
- `src/pages/GestaoModulos.tsx` — importar catálogo (mantém UI)
- `src/pages/GestaoEmpresas.tsx` — campo Tipo de Empresa
- `src/pages/DashboardEmpresa.tsx` — filtrar cards por catálogo
- `src/App.tsx` — registrar `/configuracoes/modulos-empresa`

## Fora deste escopo (fica para próximas fases se você quiser)
- Implementar telas dos módulos novos (Clínica, Agenda, OS) — só o **slot** no catálogo entra agora
- Refatorar Fitness/Academy (já são módulos isolados; ficam como estão)
- Marketplace de módulos, billing por módulo

## Garantias de não-regressão
1. Toda mudança no sidebar/dashboard passa por `canAccessModule` que já **default = true** quando não há registro → empresas atuais veem tudo como hoje
2. Migração só adiciona colunas/tabela com default → zero impacto em dados atuais
3. Rotas atuais intocadas
4. Estoque, Scanner, Gestão de Pessoas, Financeiro: nenhum arquivo dessas features é editado

Se aprovado, aplico em uma migração + edits em paralelo.
