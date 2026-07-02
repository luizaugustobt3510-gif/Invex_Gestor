# Refatoração: Tipo de Empresa × Módulos × Perfis

## Diagnóstico atual

Hoje os três conceitos estão entrelaçados:

- **Tipo de Empresa** (`companies.company_type`) — ao trocar o tipo, `ModulosEmpresa.tsx` aplica template e pode desligar módulos.
- **Módulos** (`company_modules`) — corretamente isolados por empresa, mas a UI mistura template + toggle.
- **Perfis** (`user_roles.role` + função SQL `user_has_domain_access`) — o **nome do perfil** determina módulos (ex.: `rh` → acesso a `rh`, `financeiro` → acesso a `financeiro`), violando a regra "perfil não representa módulo".
- `user_module_permissions` já existe mas é tratado como *exceção*, não como fonte primária.
- Sidebar (`AppSidebar.tsx`) e `RoleProtectedRoute` combinam checagem por role + módulo, com fallback por role.

## Nova arquitetura

```text
Empresa ativa Módulo  →  Perfil recebe permissão para Módulo  →  Usuário herda do Perfil
     (company_modules)      (role_module_permissions [NOVO])       (user_roles → role)
```

O nome do perfil deixa de implicar módulos. Passa a existir uma matriz **Perfil × Módulo** por empresa.

## Mudanças (aditivas, sem remover nada)

### 1. Banco de dados (migração única)

- Nova tabela `role_module_permissions(company_id, role, module_key, is_active)`, com RLS: admin da empresa gerencia, membros leem.
- **Seed de compatibilidade**: para cada empresa × role × módulo existente, inserir `is_active=true` refletindo o comportamento atual de `user_has_domain_access` (garante "ninguém perde acesso").
- Nova função `role_has_module(_user_id, _company_id, _module_key)` que consulta a nova tabela; `super_admin` e `admin_empresa` sempre true.
- Atualizar `user_has_domain_access` para: `company_modules.is_active AND (role_has_module OR user_module_permissions override) AND user_module_permissions != false`. Comportamento resultante equivale ao atual após o seed.
- `user_can_write_module` idem, mantendo a lógica de escrita.

### 2. Tipo de Empresa (somente sugestão)

- Ao trocar `company_type` em `ModulosEmpresa.tsx` / `GestaoEmpresas.tsx`: **não** aplicar template automaticamente. Apenas exibir botão "Aplicar template sugerido" (já aditivo hoje).
- Remover qualquer efeito colateral do `company_type` sobre `company_modules`.

### 3. Módulos (tela dedicada)

- `ModulosEmpresa.tsx` passa a cuidar **apenas** dos toggles de `company_modules`. Sem seleção de perfis, sem template forçado.

### 4. Perfis (nova tela)

- Nova página `src/pages/GestaoPerfis.tsx` (admin da empresa e superadm) — matriz Perfil × Módulo:
  - Linhas: roles em uso na empresa.
  - Colunas: módulos ativos da empresa.
  - Toggle grava em `role_module_permissions`.
- Adicionar rota `/gestao-perfis` e item na sidebar (grupo Administração).

### 5. Frontend de permissão

- `useModuleAccess`: além de `company_modules` e `user_module_permissions`, ler `role_module_permissions` para o role do usuário. Regra final:
  `companyActive && (roleAllowed || userOverrideTrue) && userOverrideFalse !== true`.
- `AppSidebar` e `RoleProtectedRoute`: manter checagem por módulo; o gate por role atual permanece para telas de gestão (superadm/admin), sem mudar comportamento.
- Fitness/Clínica/Solicitante: fluxos de redirecionamento por role em `Index.tsx` permanecem (é UX, não permissão).

### 6. Compatibilidade

- Seed inicial replica exatamente o mapa role→módulo atual → nenhum usuário perde acesso.
- Módulos já ativos continuam ativos. Nada é apagado.
- `user_module_permissions` continua funcionando como override individual.

## Fora do escopo

- Renomear roles, alterar enum `app_role`, mexer em dados de negócio.
- Reescrever telas de Logística/RH/Financeiro.
- Trocar templates do `companyTypeTemplates.ts` (só deixam de ser aplicados automaticamente).

## Entregáveis

1. Migração SQL (tabela + função + seed + policies + GRANTs).
2. `useModuleAccess.ts` atualizado.
3. `ModulosEmpresa.tsx` simplificado (só toggles + botão "aplicar sugestão").
4. `GestaoPerfis.tsx` novo + rota + item de sidebar.
5. Sem alterações destrutivas em `RoleProtectedRoute`, `AuthContext`, roles ou dados.

Confirma que sigo com essa direção? Em especial: **manter todos os roles atuais** e apenas adicionar a matriz Perfil×Módulo por empresa (sem renomear/consolidar roles)?
