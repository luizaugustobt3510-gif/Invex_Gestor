# Área de Downloads no site do Invex

Adicionar uma seção de downloads na página pública de divulgação (/institucional), onde você pode publicar arquivos com um nome amigável (ex: "Baixe o app de fitness", "Baixe a versão desktop") e os visitantes baixam com um clique.

## O que você vai ter

1. **Seção "Downloads" no site** — cards com nome, descrição curta, tamanho do arquivo e botão de baixar. Aparece só se houver arquivos publicados.
2. **Painel de gerenciamento (só Super Administrador)** — nova página no menu do painel Super Admin para:
   - enviar um arquivo (APK, instalador, PDF, ZIP etc., até 50 MB)
   - definir título, descrição e ordem de exibição
   - ativar/desativar sem apagar
   - excluir em definitivo (arquivo removido do armazenamento também)
3. **Contagem de downloads** por item, visível apenas no painel.

## Detalhes técnicos

- Tabela `public.app_downloads`: `id`, `titulo`, `descricao`, `arquivo_path`, `arquivo_nome`, `tamanho_bytes`, `content_type`, `ordem`, `ativo`, `downloads_count`, `created_at`, `created_by`.
- GRANTs: `SELECT` para `anon` e `authenticated`; `ALL` para `service_role`. RLS ligada: leitura pública apenas de `ativo = true`; escrita/alteração/remoção somente para `superadm` (via função de verificação de papel já existente no projeto).
- Bucket de storage público `app-downloads` com políticas: leitura pública; insert/update/delete apenas superadm.
- Página nova `src/pages/superadmin/GestaoDownloads.tsx` + rota protegida por `superadm`, item no menu lateral do Super Admin.
- Seção nova em `src/pages/Institucional.tsx` consumindo a lista pública ordenada por `ordem`, com link direto para a URL pública do storage e `download` no anchor.
- Incremento de `downloads_count` via função RPC `security definer` chamada no clique (falha silenciosa não bloqueia o download).
- Nada existente é alterado além da inclusão da seção e das rotas/menu — módulos e fluxos atuais permanecem intactos.
