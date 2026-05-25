# Invex Fitness — Refatoração do Módulo Academia

Transformar o atual módulo Academia (gestão de alunos/mensalidades) em **Invex Fitness**: um app pessoal de treinos com IA, gamificação e acompanhamento de evolução física. Cada usuário tem login próprio, vinculado à empresa "Invex Fitness".

---

## 1. Escopo e abordagem

Dado o tamanho da entrega, proponho fazer em **3 fases** (cada uma aprovada antes da próxima):

### Fase 1 — Fundação (esta entrega)
- Renomear módulo `academia` → `invex_fitness` na sidebar e rotas
- Remover telas antigas (Alunos, Mensalidades, Dashboard Academia financeiro)
- Criar nova empresa "Invex Fitness" + role `fitness_user`
- Estrutura de banco completa (perfis, treinos, exercícios, medidas, conquistas, amigos, XP)
- Tela de login dedicada e onboarding (escolha de avatar + nome do mascote)
- Dashboard principal futurista (dark, neon, animado) com avatar, nível, XP, streak
- Cadastro manual de usuário pelo admin (vincula à empresa Invex Fitness)
- Tema dark cyberpunk/Tesla isolado do resto do app (só dentro de `/fitness/*`)

### Fase 2 — Treinos e Acompanhamento ✅ (em andamento)
- ✅ Fichas de treino com exercícios (séries, reps, carga, descanso)
- ✅ Sessão de treino com cronômetro, descanso, marcação por exercício, XP e streak
- ✅ Medidas corporais (peso, cintura, etc.), IMC e gráfico de evolução de peso
- ✅ Aba "Alimentação" placeholder (próxima fase)
- ⏳ Fotos de evolução, modo academia, IA de progressão de carga

### Fase 3 — Social, Gamificação completa e IA Coach
- Sistema completo de conquistas/medalhas/títulos
- Amigos, ranking, desafios mensais, curtidas
- Coach IA conversacional (chat)
- Relatórios automáticos, detecção de desânimo
- Avatar 3D reagindo à evolução

---

## 2. O que entra na Fase 1 (esta entrega)

### Backend (migração SQL)
- Criar empresa **Invex Fitness** + módulo `invex_fitness` ativo
- Novo enum role: `fitness_user`
- Tabelas:
  - `fitness_profiles` — user_id, nome, foto_url, avatar_id (1-4), mascote_nome, nivel, xp, streak_dias, peso_atual, altura, meta_peso, criado em
  - `fitness_workouts` — placeholder (estrutura básica para Fase 2)
  - `fitness_measurements` — placeholder
  - `fitness_achievements` — id, codigo, nome, descricao, icone, xp_recompensa
  - `fitness_user_achievements` — user_id, achievement_id, conquistado_em
  - `fitness_friends` — placeholder
- RLS: cada usuário vê só os próprios dados; admin da empresa Invex Fitness vê todos
- Bucket de storage `fitness-photos` (privado, isolado por user_id)
- 4 avatares iniciais cadastrados (2 femininos cute, 2 masculinos cute) gerados via IA
- Seed de ~10 conquistas iniciais

### Frontend
- Rotas novas em `/fitness/*` (substitui `/academia/*`):
  - `/fitness` — Dashboard principal
  - `/fitness/onboarding` — escolher avatar + nome do mascote (1ª vez)
  - `/fitness/perfil` — editar foto, nome, metas
  - `/fitness/treinos` — placeholder "Em breve"
  - `/fitness/evolucao` — placeholder "Em breve"
  - `/fitness/conquistas` — lista de medalhas
- **Layout próprio** `FitnessLayout` (dark, sem sidebar do app principal) — bottom nav mobile-first
- Componentes novos:
  - `AvatarMascote` — exibe avatar escolhido + balão de fala animado com mensagens
  - `XPBar`, `StreakFlame`, `LevelBadge`
  - `FuturisticCard` (glassmorphism, glow neon)
- Tela de login dedicada `/fitness/login` (visual diferente, neon)
- Cadastro de usuário fitness via Gestão de Usuários (admin escolhe role `fitness_user` + empresa Invex Fitness)
- Tokens de design dark/neon adicionados ao `index.css` com prefixo `--fitness-*` (não afeta resto do app)
- Frases motivacionais via Lovable AI (edge function `fitness-coach-message`) — gera 1 mensagem contextual ao abrir o dashboard

### Remoções
- Apagar `src/pages/academia/Alunos.tsx`, `Mensalidades.tsx`, `DashboardAcademia.tsx`
- Tirar rotas de academia de `App.tsx`
- Remover item "Academia" antigo da sidebar
- Tabelas `academy_students` e `academy_payments`: **manter** no banco para não perder dados, mas sem UI (deletar em fase posterior se confirmado)

---

## 3. Detalhes técnicos

**Stack mantido**: React + Tailwind + shadcn + Supabase. Animações com `framer-motion` (adicionar). Sons sutis via `<audio>` HTML5 com toggle global.

**Avatares**: 4 PNGs gerados (premium quality) em `src/assets/fitness-avatars/`:
- `mei.png` — fem, cabelo rosa, estilo anime fofo
- `luna.png` — fem, esportiva, cyberpunk soft
- `kai.png` — masc, jovem, vibe streetwear
- `jax.png` — masc, robô-mascote estilo Jarvis

**Tema dark isolado**: `<FitnessLayout>` aplica `data-theme="fitness-dark"` no wrapper; CSS escopado com `[data-theme="fitness-dark"]`.

**IA**: edge function `fitness-coach-message` chama Lovable AI (`google/gemini-3-flash-preview`) com contexto do usuário (último treino, streak, dia da semana) e retorna 1 frase curta.

**Mobile-first**: bottom navigation, botões mínimos 48px, viewport 100dvh.

---

## 4. Perguntas para liberar

1. **Empresa "Invex Fitness"**: crio uma nova empresa no banco automaticamente, ou você vai criar manualmente pelo SuperAdmin?
2. **Usuários fitness**: vão usar o login normal do app (mesma tela `/login`) ou quer uma URL/tela separada `/fitness/login`?
3. **Avatares**: posso gerar os 4 com IA (estilo anime cute) ou prefere que eu use ícones/ilustrações vetoriais?
4. **Fase 1 OK?** Ou prefere outra divisão (ex.: tudo de uma vez, mesmo levando bem mais tempo e ficando com menos polimento por área)?

Após suas respostas, sigo direto com a migração + código da Fase 1.